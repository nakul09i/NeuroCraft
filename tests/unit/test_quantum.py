"""Unit tests for the Quantum Trust Simulation Engine."""

import pytest
from neurocraft_quantum.simulator import QuantumTrustSimulator
from neurocraft_types import QuantumScenarioEnum, QuantumSimulationRequest


@pytest.fixture
def simulator() -> QuantumTrustSimulator:
    return QuantumTrustSimulator(default_threshold=0.08)


def test_quantum_sim_legitimate(simulator: QuantumTrustSimulator):
    req = QuantumSimulationRequest(
        scenario=QuantumScenarioEnum.LEGITIMATE,
        shots=1000,
        qubits=2,
        noise_level=0.0,
    )
    res = simulator.run_simulation(req, user_id="test-user", seed=42)

    assert res.is_simulated is True
    assert res.environment_badge == "SIMULATED QUANTUM ENVIRONMENT"
    assert res.scenario == QuantumScenarioEnum.LEGITIMATE
    assert res.deviation <= res.threshold
    assert res.verdict == "NO ATTACK DETECTED"
    assert "00" in res.observed_distribution
    assert "11" in res.observed_distribution
    assert res.user_id == "test-user"


@pytest.mark.parametrize(
    "attack_scenario",
    [
        QuantumScenarioEnum.FORGERY,
        QuantumScenarioEnum.REPLAY,
        QuantumScenarioEnum.IMPERSONATION,
        QuantumScenarioEnum.CHANNEL_MANIPULATION,
    ],
)
def test_quantum_sim_attack_scenarios(
    simulator: QuantumTrustSimulator, attack_scenario: QuantumScenarioEnum
):
    req = QuantumSimulationRequest(
        scenario=attack_scenario,
        shots=1000,
        qubits=2,
        noise_level=0.0,
    )
    res = simulator.run_simulation(req, seed=42)

    assert res.is_simulated is True
    assert res.environment_badge == "SIMULATED QUANTUM ENVIRONMENT"
    assert res.scenario == attack_scenario
    assert res.deviation > res.threshold
    assert res.verdict == "ATTACK DETECTED"
    assert len(res.explanation) > 0


def test_quantum_sim_reproducibility(simulator: QuantumTrustSimulator):
    req = QuantumSimulationRequest(
        scenario=QuantumScenarioEnum.LEGITIMATE,
        shots=500,
        qubits=2,
    )
    res1 = simulator.run_simulation(req, seed=123)
    res2 = simulator.run_simulation(req, seed=123)

    assert res1.observed_distribution == res2.observed_distribution
    assert res1.deviation == res2.deviation
