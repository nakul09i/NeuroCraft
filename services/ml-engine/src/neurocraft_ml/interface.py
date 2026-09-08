"""ML Engine interface and future-compatible inference contract."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from neurocraft_types import EngineStatusEnum, MLPrediction


class MLAnalysisEngine(ABC):
    """Abstract contract for machine learning inference engines."""

    @abstractmethod
    def predict(self, features: dict[str, Any]) -> MLPrediction:
        """Run inference over extracted static features."""
        pass

    @abstractmethod
    def get_status(self) -> EngineStatusEnum:
        """Return operational status of ML engine."""
        pass


class DefaultUnconfiguredMLEngine(MLAnalysisEngine):
    """Default Phase 1 ML engine placeholder reporting NOT_CONFIGURED."""

    def __init__(self, model_path: Path | None = None):
        self.model_path = model_path

    def predict(self, features: dict[str, Any]) -> MLPrediction:
        return MLPrediction(
            model_name="none",
            model_version="0.0.0",
            prediction="UNCONFIGURED",
            probability=0.0,
            confidence=0.0,
            features_used=[],
            inference_time_ms=0.0,
            status=EngineStatusEnum.NOT_CONFIGURED,
        )

    def get_status(self) -> EngineStatusEnum:
        return EngineStatusEnum.NOT_CONFIGURED
