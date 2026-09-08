"""Quantum Trust Simulation Engine for Digital Signature Verification.

SIH-Specific Differentiator: Simulates a quantum-entangled verification channel
detecting eavesdropping, tampering, forgery, and replay via statistical deviation
of Bell-state measurement distributions from theoretical thresholds.

ENVIRONMENT: SIMULATED QUANTUM ENVIRONMENT (Pure statevector and projective measurement simulation).
"""

import math
import uuid
from datetime import UTC, datetime

import numpy as np
from neurocraft_logging import get_logger
from neurocraft_types import (
    QuantumScenarioEnum,
    QuantumSimulationRequest,
    QuantumSimulationResponse,
)

logger = get_logger("neurocraft.quantum")

DEFAULT_THRESHOLD = 0.08  # 8% statistical variation tolerance for quantum channel noise


class QuantumTrustSimulator:
    """
    Simulates quantum state transmission, channel disturbance, and projective measurement
    to verify digital signature authenticity.
    """

    def __init__(self, default_threshold: float = DEFAULT_THRESHOLD):
        self.default_threshold = default_threshold

    def run_simulation(
        self,
        request: QuantumSimulationRequest,
        user_id: str | None = None,
        seed: int | None = 42,
    ) -> QuantumSimulationResponse:
        """
        Execute controlled quantum-channel simulation.
        Deterministic seed guarantees reproducibility for audits and demonstrations.
        """
        rng = np.random.default_rng(seed)
        scenario = request.scenario
        shots = request.shots
        _qubits = request.qubits
        noise_level = request.noise_level

        # 1. Theoretical Expected Distribution for Maximally Entangled Bell State |Phi+>
        # |Phi+> = 1/sqrt(2) * (|00> + |11>)
        expected_distribution: dict[str, float] = {
            "00": 0.5000,
            "01": 0.0000,
            "10": 0.0000,
            "11": 0.5000,
        }

        # 2. Simulate Channel Mechanics based on Attack Scenario
        # State vector representation in computational basis: [|00>, |01>, |10>, |11>]
        psi = np.array([1.0 / math.sqrt(2.0), 0.0, 0.0, 1.0 / math.sqrt(2.0)], dtype=complex)

        explanation = ""

        if scenario == QuantumScenarioEnum.LEGITIMATE:
            # Clean quantum channel: minimal thermal/depolarization noise
            channel_noise = 0.01 + (noise_level * 0.02)
            probs = np.array([
                0.5 * (1.0 - channel_noise),
                0.5 * channel_noise,
                0.5 * channel_noise,
                0.5 * (1.0 - channel_noise),
            ])
            explanation = (
                "Legitimate digital signature authenticated over quantum channel. "
                "Correlated Bell-state photon pairs exhibited minimal channel noise, "
                "yielding statistical deviation strictly within the baseline security tolerance."
            )

        elif scenario == QuantumScenarioEnum.FORGERY:
            # Forgery: Adversary applied unauthorized unitary transformation R_y(pi/4)
            # tampering with the encoded signature quantum state.
            theta = math.pi / 4.0
            ry = np.array([
                [math.cos(theta / 2.0), -math.sin(theta / 2.0)],
                [math.sin(theta / 2.0), math.cos(theta / 2.0)],
            ])
            # Single-qubit operation on Qubit 0: (R_y x I)
            op = np.kron(ry, np.eye(2))
            psi_perturbed = op @ psi
            raw_probs = np.abs(psi_perturbed) ** 2
            probs = raw_probs / np.sum(raw_probs)
            explanation = (
                "Signature forgery detected: Unitary transformation anomaly observed. "
                "Adversarial tampering rotated state polarizations, generating orthogonal "
                "Bell-state projections (|01> and |10>) that violate entanglement correlation bounds."
            )

        elif scenario == QuantumScenarioEnum.REPLAY:
            # Replay attack: Adversary injected stale, captured quantum state
            # experiencing severe decoherence and phase dephasing.
            dephasing = 0.35 + (noise_level * 0.1)
            probs = np.array([
                0.5 - (dephasing * 0.3),
                dephasing * 0.3,
                dephasing * 0.3,
                0.5 - (dephasing * 0.3),
            ])
            explanation = (
                "Replay attack detected: Temporal quantum decoherence signature identified. "
                "Captured and reinjected quantum tokens suffered environmental phase damping, "
                "collapsing state fidelity below the required non-repudiation threshold."
            )

        elif scenario == QuantumScenarioEnum.IMPERSONATION:
            # Impersonation: Fraudulent entity attempts transmission without entangled pair
            # Submitting separable state |0> x |0>
            probs = np.array([0.96, 0.02, 0.02, 0.00])
            explanation = (
                "Impersonation attack detected: Zero quantum entanglement detected. "
                "Transmitted token exhibits classical separable distribution (|00>), "
                "failing the foundational EPR non-locality verification protocol."
            )

        elif scenario == QuantumScenarioEnum.CHANNEL_MANIPULATION:
            # Channel manipulation / Eavesdropping: Intercept-resend or heavy depolarization
            # Maximally mixed state
            probs = np.array([0.25, 0.25, 0.25, 0.25])
            explanation = (
                "Channel manipulation detected: Active intercept-resend eavesdropping detected. "
                "Measurement by an unauthorized observer broke entanglement symmetry, "
                "driving the Quantum Bit Error Rate (QBER) to 50% (maximally mixed state)."
            )
        else:
            probs = np.array([0.5, 0.0, 0.0, 0.5])
            explanation = "Default baseline verification."

        # 3. Simulate Projective Measurements (Shot sampling)
        outcomes = rng.choice(["00", "01", "10", "11"], size=shots, p=probs)
        counts: dict[str, int] = {"00": 0, "01": 0, "10": 0, "11": 0}
        for outcome in outcomes:
            counts[outcome] += 1

        observed_distribution = {k: round(counts[k] / shots, 4) for k in ["00", "01", "10", "11"]}

        # 4. Compute Statistical Deviation (Total Variation Distance / Trace Distance)
        # D(P, Q) = 0.5 * sum(|P(x) - Q(x)|)
        deviation = round(
            0.5 * sum(abs(expected_distribution[k] - observed_distribution[k]) for k in expected_distribution),
            4,
        )

        threshold = self.default_threshold
        threat_detected = deviation > threshold
        verdict = "ATTACK DETECTED" if threat_detected else "NO ATTACK DETECTED"

        sim_id = f"sim-{uuid.uuid4().hex[:12]}"
        logger.info(
            f"Quantum Trust Simulation [{scenario.value}]: deviation={deviation} "
            f"threshold={threshold} -> {verdict}"
        )

        return QuantumSimulationResponse(
            id=sim_id,
            user_id=user_id,
            scenario=scenario,
            is_simulated=True,
            environment_badge="SIMULATED QUANTUM ENVIRONMENT",
            expected_distribution=expected_distribution,
            observed_distribution=observed_distribution,
            deviation=deviation,
            threshold=threshold,
            verdict=verdict,
            explanation=explanation,
            created_at=datetime.now(UTC),
        )
