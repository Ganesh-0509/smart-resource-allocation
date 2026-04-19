import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the environment variables.")

# Create and export a single Supabase client instance
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_connection() -> bool:
    try:
        # Query the volunteers table to check connection
        response = supabase.table("volunteers").select("id").limit(1).execute()
        logger.info("Successfully connected to Supabase.")
        return True
    except Exception as e:
        logger.error(f"Error connecting to Supabase: {e}")
        return False
