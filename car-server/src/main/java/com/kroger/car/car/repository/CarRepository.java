package com.kroger.car.car.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import com.kroger.car.car.domain.Car;

@Repository
public interface CarRepository extends JpaRepository<Car, String>, JpaSpecificationExecutor<Car>
{
}
