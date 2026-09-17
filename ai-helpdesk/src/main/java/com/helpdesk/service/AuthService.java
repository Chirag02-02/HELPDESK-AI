package com.helpdesk.service;

import com.helpdesk.dto.AuthDTOs;
import com.helpdesk.entity.User;
import com.helpdesk.exception.AppException;
import com.helpdesk.repository.UserRepository;
import com.helpdesk.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    @Value("${app.admin-registration-code}")
    private String adminRegistrationCode;

    @Transactional
    public AuthDTOs.AuthResponse register(AuthDTOs.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException("Email already registered", HttpStatus.CONFLICT);
        }

        User.Role role = resolveRole(request.getRole(), request.getAdminCode());

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthDTOs.AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .build();
    }

    /**
     * Determines the role to assign at registration.
     * - Blank/missing role, or "CUSTOMER" -> always CUSTOMER, no code needed.
     * - "AGENT" or "ADMIN" -> only allowed if adminCode matches app.admin-registration-code.
     */
    private User.Role resolveRole(String requestedRole, String adminCode) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return User.Role.CUSTOMER;
        }

        User.Role role;
        try {
            role = User.Role.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AppException("Invalid role. Must be CUSTOMER, AGENT, or ADMIN", HttpStatus.BAD_REQUEST);
        }

        if (role == User.Role.CUSTOMER) {
            return role;
        }

        // AGENT or ADMIN requested - require a valid code
        if (adminCode == null || adminCode.isBlank() || !adminCode.equals(adminRegistrationCode)) {
            throw new AppException("Invalid or missing admin registration code", HttpStatus.FORBIDDEN);
        }

        return role;
    }

    public AuthDTOs.AuthResponse login(AuthDTOs.LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtUtil.generateToken(userDetails);

        return AuthDTOs.AuthResponse.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .profilePhotoUrl(user.getProfilePhotoUrl())
                .build();
    }
}
