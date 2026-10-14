class DocuMindException(Exception):
    """Base exception for DocuMind application."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class DocumentNotFoundError(DocuMindException):
    def __init__(self, document_id: str):
        super().__init__(f"Document with ID '{document_id}' not found.", status_code=404)


class DocumentProcessingError(DocuMindException):
    def __init__(self, message: str):
        super().__init__(f"Document processing failed: {message}", status_code=422)


class InvalidFileTypeError(DocuMindException):
    def __init__(self, extension: str):
        super().__init__(f"Unsupported file format '{extension}'. Allowed: PDF, DOCX, TXT, MD.", status_code=400)


class FileTooLargeError(DocuMindException):
    def __init__(self, max_size_mb: int):
        super().__init__(f"File exceeds maximum size limit of {max_size_mb} MB.", status_code=413)


class OllamaServiceError(DocuMindException):
    def __init__(self, message: str):
        super().__init__(f"Local LLM service error: {message}", status_code=503)
