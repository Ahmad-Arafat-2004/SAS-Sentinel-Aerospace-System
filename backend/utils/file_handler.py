import os
import uuid
from werkzeug.utils import secure_filename


def allowed_file(filename, allowed_extensions):
    """
    Checks if uploaded file extension is allowed.

    Example:
    allowed_extensions = {"jpg", "jpeg", "png", "webp"}
    """

    if not filename:
        return False

    if "." not in filename:
        return False

    ext = filename.rsplit(".", 1)[1].lower().strip()
    return ext in allowed_extensions


def get_file_extension(filename):
    """
    Returns lowercase file extension without dot.
    """

    if not filename or "." not in filename:
        return ""

    return filename.rsplit(".", 1)[1].lower().strip()


def ensure_folder(path):
    """
    Creates folder if it does not exist.
    """

    os.makedirs(path, exist_ok=True)


def get_file_size_mb(file_path):
    """
    Returns file size in MB.
    """

    if not os.path.exists(file_path):
        return 0

    size_bytes = os.path.getsize(file_path)
    return round(size_bytes / (1024 * 1024), 3)


def save_uploaded_file(file, upload_dir, allowed_extensions=None):
    """
    Saves uploaded file with a safe unique name.

    Returns:
    {
        "original_name": "...",
        "saved_name": "...",
        "path": "...",
        "extension": "...",
        "size_mb": 1.25
    }
    """

    ensure_folder(upload_dir)

    if not file:
        raise ValueError("No file object provided.")

    if not file.filename:
        raise ValueError("Uploaded file has no filename.")

    original_name = secure_filename(file.filename)

    if not original_name:
        raise ValueError("Invalid filename after security cleanup.")

    ext = get_file_extension(original_name)

    if not ext:
        raise ValueError("Uploaded file has no extension.")

    if allowed_extensions is not None and ext not in allowed_extensions:
        raise ValueError(f"File extension '{ext}' is not allowed.")

    new_name = f"{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(upload_dir, new_name)

    file.save(save_path)

    if not os.path.exists(save_path):
        raise RuntimeError("File was not saved successfully.")

    return {
        "original_name": original_name,
        "saved_name": new_name,
        "path": save_path,
        "extension": ext,
        "size_mb": get_file_size_mb(save_path),
    }