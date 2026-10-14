import json
import httpx
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import OllamaServiceError
from app.repositories.sqlite_repo import SQLiteRepository

class OllamaService:
    """Service for interacting with local Ollama runtime for LLM inference."""

    @staticmethod
    def get_base_url() -> str:
        return settings.OLLAMA_BASE_URL.rstrip("/")

    @classmethod
    def get_active_model(cls) -> str:
        """Fetch model name from database override or settings default."""
        saved_model = SQLiteRepository.get_setting("llm_model")
        if saved_model:
            return saved_model
        return settings.DEFAULT_LLM_MODEL

    @classmethod
    async def is_available(cls) -> bool:
        """Check if Ollama server is running and reachable."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{cls.get_base_url()}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    @classmethod
    async def list_models(cls) -> List[str]:
        """List all locally pulled models in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{cls.get_base_url()}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m["name"] for m in data.get("models", [])]
                    return models
                return []
        except Exception as e:
            logger.warning(f"Could not list Ollama models: {e}")
            return []

    @classmethod
    async def generate(
        cls,
        prompt: str,
        system_prompt: str,
        model: Optional[str] = None
    ) -> str:
        """Generate non-streaming response from local LLM."""
        target_model = model or cls.get_active_model()
        url = f"{cls.get_base_url()}/api/generate"
        payload = {
            "model": target_model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.45,
                "top_p": 0.9,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_REQUEST_TIMEOUT) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 404:
                    raise OllamaServiceError(f"Model '{target_model}' not found in Ollama. Run 'ollama pull {target_model}' or choose an installed model.")
                if res.status_code != 200:
                    raise OllamaServiceError(f"Ollama returned HTTP {res.status_code}: {res.text}")
                
                data = res.json()
                return data.get("response", "").strip()
        except httpx.ConnectError:
            raise OllamaServiceError("Ollama is not running. Please start Ollama or run 'ollama serve'.")
        except httpx.TimeoutException:
            raise OllamaServiceError("Ollama request timed out while generating answer.")
        except Exception as e:
            if isinstance(e, OllamaServiceError):
                raise
            logger.error(f"Error calling Ollama: {e}")
            raise OllamaServiceError(str(e))

    @classmethod
    async def generate_stream(
        cls,
        prompt: str,
        system_prompt: str,
        model: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens from local LLM."""
        target_model = model or cls.get_active_model()
        url = f"{cls.get_base_url()}/api/generate"
        payload = {
            "model": target_model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": True,
            "options": {
                "temperature": 0.45,
                "top_p": 0.9,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_REQUEST_TIMEOUT) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code == 404:
                        yield json.dumps({"error": f"Model '{target_model}' not found in Ollama. Run 'ollama pull {target_model}'."}) + "\n"
                        return
                    if response.status_code != 200:
                        yield json.dumps({"error": f"Ollama returned HTTP {response.status_code}"}) + "\n"
                        return

                    async for line in response.aiter_lines():
                        if line:
                            try:
                                chunk_json = json.loads(line)
                                token = chunk_json.get("response", "")
                                done = chunk_json.get("done", False)
                                yield json.dumps({"token": token, "done": done}) + "\n"
                                if done:
                                    break
                            except Exception:
                                continue
        except httpx.ConnectError:
            yield json.dumps({"error": "Ollama is not running. Please start Ollama."}) + "\n"
        except Exception as e:
            logger.error(f"Ollama streaming exception: {e}")
            yield json.dumps({"error": str(e)}) + "\n"
