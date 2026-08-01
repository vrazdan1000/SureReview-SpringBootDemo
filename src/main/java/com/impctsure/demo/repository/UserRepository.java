package com.impctsure.demo.repository;

import com.impctsure.demo.model.User;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

	List<User> findByName(String name);
	
}

