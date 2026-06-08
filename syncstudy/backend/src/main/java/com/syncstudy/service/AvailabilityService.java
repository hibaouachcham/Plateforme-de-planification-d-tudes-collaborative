package com.syncstudy.service;

import com.syncstudy.dto.request.CreateAvailabilityRequest;
import com.syncstudy.model.Availability;
import com.syncstudy.repository.AvailabilityRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AvailabilityService {
    private final AvailabilityRepository availabilityRepository;

    public AvailabilityService(AvailabilityRepository availabilityRepository) {
        this.availabilityRepository = availabilityRepository;
    }

    public List<Availability> getAvailabilitiesByUser(String userId) {
        return availabilityRepository.findByUserId(userId);
    }

    public List<Availability> saveAvailabilities(String userId, CreateAvailabilityRequest req) {
        availabilityRepository.deleteByUserId(userId);
        List<Availability> list = new ArrayList<>();
        if (req.getSlots() != null) {
            for (CreateAvailabilityRequest.AvailabilitySlot slot : req.getSlots()) {
                list.add(Availability.builder()
                        .userId(userId)
                        .dayOfWeek(slot.getDayOfWeek())
                        .startTime(slot.getStartTime())
                        .endTime(slot.getEndTime())
                        .recurring(slot.isRecurring())
                        .build());
            }
        }
        return availabilityRepository.saveAll(list);
    }

    public List<Availability> saveAvailabilitiesRaw(String userId, List<Availability> slots) {
        availabilityRepository.deleteByUserId(userId);
        List<Availability> list = slots == null ? List.of() : slots.stream()
                .map(a -> Availability.builder()
                        .userId(userId)
                        .dayOfWeek(a.getDayOfWeek())
                        .startTime(a.getStartTime())
                        .endTime(a.getEndTime())
                        .recurring(a.isRecurring())
                        .build())
                .toList();
        return availabilityRepository.saveAll(list);
    }

    public void deleteAvailability(String userId, String availabilityId) {
        availabilityRepository.findById(availabilityId)
                .filter(a -> userId.equals(a.getUserId()))
                .ifPresent(a -> availabilityRepository.deleteById(availabilityId));
    }
}
