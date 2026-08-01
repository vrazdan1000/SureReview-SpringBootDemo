package com.impctsure.demo.controller;

import com.impctsure.demo.model.User;
import com.impctsure.demo.repository.UserRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // POST → save a new user
    @PostMapping
    public User createUser(@RequestBody User user) {
        return userRepository.save(user);
    }

    // GET → list all users
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}