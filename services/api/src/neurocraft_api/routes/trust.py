"""Quantum Trust Simulation API routes."""

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from neurocraft_quantum import QuantumTrustSimulator
from neurocraft_types import (
    QuantumSimulationRequest,
    QuantumSimulationResponse,
    UserContext,
)

from neurocraft_api.auth import get_optional_user
from neurocraft_api.database import (
    get_quantum_simulation_by_id,
    get_quantum_simulations_for_user,
    save_quantum_simulation,
)

router = APIRouter(prefix="/api/v1/quantum", tags=["Quantum Trust"])
quantum_simulator = QuantumTrustSimulator()


@router.post(
    "/simulations",
    response_model=QuantumSimulationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute controlled Quantum Trust simulation scenario",
)
@router.post(
    "/simulate",
    response_model=QuantumSimulationResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_quantum_simulation(
    req: QuantumSimulationRequest,
    user: UserContext | None = Depends(get_optional_user),
) -> QuantumSimulationResponse:
    """
    Executes a reproducible statevector quantum-channel simulation for digital signature verification.
    Clearly labeled: SIMULATED QUANTUM ENVIRONMENT.
    """
    user_id = user.user_id if user else None
    sim_res = quantum_simulator.run_simulation(req, user_id=user_id)
    await save_quantum_simulation(sim_res, user_id=user_id)
    return sim_res


@router.get(
    "/simulations",
    summary="List quantum trust simulations",
)
async def list_quantum_simulations(
    limit: int = 50,
    user: UserContext | None = Depends(get_optional_user),
) -> list[dict[str, Any]]:
    """List recent quantum simulations."""
    user_id = user.user_id if user else None
    records = await get_quantum_simulations_for_user(user_id=user_id, limit=limit)
    return [
        {
            "id": r.id,
            "scenario": r.scenario,
            "deviation": r.deviation,
            "threshold": r.threshold,
            "verdict": r.verdict,
            "is_simulated": True,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get(
    "/simulations/{simulation_id}",
    response_model=QuantumSimulationResponse,
    summary="Retrieve quantum simulation details",
)
async def get_quantum_simulation(
    simulation_id: str,
    user: UserContext | None = Depends(get_optional_user),
) -> QuantumSimulationResponse:
    """Retrieve full quantum simulation measurement data and explanation."""
    user_id = user.user_id if user else None
    rec = await get_quantum_simulation_by_id(simulation_id, user_id)
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quantum simulation '{simulation_id}' not found or access denied.",
        )

    return QuantumSimulationResponse(
        id=rec.id,
        user_id=rec.user_id,
        scenario=rec.scenario,
        is_simulated=True,
        environment_badge="SIMULATED QUANTUM ENVIRONMENT",
        expected_distribution=(
            json.loads(rec.expected_distribution_json) if rec.expected_distribution_json else {}
        ),
        observed_distribution=(
            json.loads(rec.observed_distribution_json) if rec.observed_distribution_json else {}
        ),
        deviation=rec.deviation,
        threshold=rec.threshold,
        verdict=rec.verdict,
        explanation=rec.explanation,
        created_at=rec.created_at,
    )
