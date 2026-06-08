package com.syncstudy.service;

/**
 * Levée quand des créneaux de disponibilité se chevauchent lors de la génération du planning.
 */
public class AvailabilityOverlapException extends RuntimeException {

    private final String overlapDetail;

    public AvailabilityOverlapException(String overlapDetail) {
        super(overlapDetail);
        this.overlapDetail = overlapDetail;
    }

    public String getOverlapDetail() {
        return overlapDetail;
    }
}
