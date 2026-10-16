"""Settings read from environment variables.

Locally they come from product/.env (loaded below). On Alternate Clouds they come
from the service's Variables tab. Optional integrations stay off when unset.
"""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


@dataclass(frozen=True)
class Settings:
    app_name: str
    version: str
    public_base_url: str
    demo_mode: bool
    data_dir: Path

    @property
    def is_local(self) -> bool:
        return "localhost" in self.public_base_url or "127.0.0.1" in self.public_base_url

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            app_name=_get("APP_NAME", "Countersign"),
            version=_get("APP_VERSION", "0.1.0"),
            public_base_url=_get("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/"),
            demo_mode=_get("DEMO_MODE", "true").lower() in {"1", "true", "yes"},
            data_dir=Path(_get("DATA_DIR", "./data")),
        )


settings = Settings.from_env()
