import boto3
from config.settings import settings
import datetime
from PIL import Image
import io

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION
    )

def upload_bill_to_s3(file_obj, user_uuid: str, expense_uuid: str, filename: str, content_type: str) -> str:
    s3 = get_s3_client()
    now = datetime.datetime.now()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    
    # Extract extension from filename or default to jpg
    ext = filename.split(".")[-1].lower() if "." in filename else "jpg"
    
    # Compress if it's an image
    if content_type.startswith("image/"):
        try:
            image = Image.open(file_obj)
            # Convert RGBA to RGB for JPEG compatibility
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
            
            # Compress to JPEG
            output_io = io.BytesIO()
            # quality=60 heavily reduces size (to KB range) with minimal quality loss for receipts
            image.save(output_io, format="JPEG", optimize=True, quality=60)
            output_io.seek(0)
            
            # Use the compressed image
            file_obj = output_io
            ext = "jpg"
            content_type = "image/jpeg"
        except Exception as e:
            print(f"Image compression failed: {e}")
            # Fallback to original file
            file_obj.seek(0)
    
    # Format: expenses/USR000001/2026/07/EXP000021.jpg
    s3_key = f"expenses/{user_uuid}/{year}/{month}/{expense_uuid}.{ext}"
    
    s3.upload_fileobj(
        file_obj,
        settings.AWS_S3_BUCKET_NAME,
        s3_key,
        ExtraArgs={"ContentType": content_type}
    )
    
    return s3_key

def generate_presigned_url(s3_key: str, expiration=3600) -> str:
    if not s3_key:
        return None
        
    s3 = get_s3_client()
    try:
        response = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_S3_BUCKET_NAME,
                'Key': s3_key
            },
            ExpiresIn=expiration
        )
        return response
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return None
