import pytest
from pathlib import Path
from app.utils.file_utils import (
    sanitize_filename,
    validate_file,
    clean_text,
    extract_text_from_txt,
    extract_document_text
)
from app.core.exceptions import InvalidFileTypeError, FileTooLargeError, DocumentProcessingError

def test_sanitize_filename():
    assert sanitize_filename("safe_file.pdf") == "safe_file.pdf"
    assert sanitize_filename("../../etc/passwd.txt") == "passwd.txt"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("my report (final) & 2026.docx") == "my_report_final_2026.docx"

def test_validate_file():
    # Valid
    assert validate_file("test.pdf", 1024) == ".pdf"
    assert validate_file("test.docx", 2048) == ".docx"
    assert validate_file("notes.txt", 500) == ".txt"
    assert validate_file("readme.md", 300) == ".md"

    # Unsupported extension
    with pytest.raises(InvalidFileTypeError):
        validate_file("malicious.exe", 1024)

    with pytest.raises(InvalidFileTypeError):
        validate_file("data.csv", 1024)

    # Empty file
    with pytest.raises(DocumentProcessingError):
        validate_file("empty.txt", 0)

    # Too large file
    with pytest.raises(FileTooLargeError):
        validate_file("huge.pdf", 50 * 1024 * 1024)

def test_clean_text():
    dirty = "Hello   world!\r\n\r\n\n\nThis is\ta   test.\u00a0"
    cleaned = clean_text(dirty)
    assert "Hello world!" in cleaned
    assert "\t" not in cleaned
    assert "\r" not in cleaned

def test_extract_text_from_txt(tmp_path):
    txt_file = tmp_path / "sample.txt"
    txt_file.write_text("This is an extraction test.\nLine 2 content.", encoding="utf-8")
    
    extracted = extract_document_text(txt_file, ".txt")
    assert len(extracted) == 1
    assert "Line 2 content." in extracted[0]["text"]
    assert extracted[0]["page_number"] == 1
