package com.helpdesk.service;

import com.helpdesk.dto.AuthDTOs;
import com.helpdesk.entity.User;
import com.helpdesk.exception.AppException;
import com.helpdesk.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads/profiles}")
    private String uploadDir;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    );

    public List<User> getAdminUsers() {
        return userRepository.findAdminUsers();
    }

    public List<User> getSupportAgents() {
        return userRepository.findSupportAgents();
    }

    @Transactional(readOnly = true)
    public AuthDTOs.ProfileResponse getUserProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User profile not found", HttpStatus.NOT_FOUND));

        return toProfileResponse(user);
    }

    @Transactional
    public AuthDTOs.ProfileResponse updateUserProfile(String email, AuthDTOs.UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User profile not found", HttpStatus.NOT_FOUND));

        if (request.getName() == null || request.getName().isBlank()) {
            throw new AppException("Full name cannot be blank", HttpStatus.BAD_REQUEST);
        }

        if (request.getName().trim().length() > 100) {
            throw new AppException("Full name cannot exceed 100 characters", HttpStatus.BAD_REQUEST);
        }

        user.setName(request.getName().trim());

        if (request.getProfilePhotoUrl() != null) {
            user.setProfilePhotoUrl(request.getProfilePhotoUrl().trim());
        }

        User updated = userRepository.save(user);
        log.info("User profile updated for user ID: {}, email: {}", updated.getId(), email);
        return toProfileResponse(updated);
    }

    @Transactional
    public String storeProfilePhoto(String email, MultipartFile file) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User profile not found", HttpStatus.NOT_FOUND));

        if (file == null || file.isEmpty()) {
            throw new AppException("Please select a valid image file to upload", HttpStatus.BAD_REQUEST);
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AppException("Image file size exceeds maximum limit of 5 MB", HttpStatus.BAD_REQUEST);
        }

        String contentType = file.getContentType();
        if (contentType == null || (!ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase()) && !contentType.toLowerCase().startsWith("image/"))) {
            throw new AppException("Invalid file type. Only JPG, JPEG, PNG, WEBP, and GIF images are allowed", HttpStatus.BAD_REQUEST);
        }

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = ".png";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
            }

            String newFilename = "user_" + user.getId() + "_" + System.currentTimeMillis() + extension;
            Path targetLocation = uploadPath.resolve(newFilename);

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            String photoUrl = "/api/uploads/profiles/" + newFilename;
            user.setProfilePhotoUrl(photoUrl);
            userRepository.save(user);

            log.info("Stored profile photo for user ID: {} at {}", user.getId(), targetLocation);
            return photoUrl;
        } catch (IOException ex) {
            log.error("Failed to store profile photo for user {}", email, ex);
            throw new AppException("Could not save uploaded profile image. Please try again", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private AuthDTOs.ProfileResponse toProfileResponse(User user) {
        return AuthDTOs.ProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .active(user.isActive())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .build();
    }
}
