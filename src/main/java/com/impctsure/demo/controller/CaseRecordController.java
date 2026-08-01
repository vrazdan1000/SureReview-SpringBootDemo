package com.impctsure.demo.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.impctsure.demo.model.CaseRecord;
import com.impctsure.demo.service.CaseRecordService;


@RestController
@RequestMapping("/api/cases")
public class CaseRecordController {

	private final CaseRecordService service;
	
	public CaseRecordController(CaseRecordService caseRecordService) {
		this.service = caseRecordService;
	}
	
	@GetMapping
	public List<CaseRecord> getAll(){
		return service.getAll();
	}
	
	@PostMapping
	public ResponseEntity<?> add(@RequestBody CaseRecord record){
		try {
			return ResponseEntity.ok(service.add(record));
		}
		catch(IllegalArgumentException e){
			return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
		}
	}
	
	@PutMapping("/{caseId}")
	public ResponseEntity<?> update(@PathVariable String caseId, //@PathVariable grabs the caseId from the URL
									@RequestBody CaseRecord record){   //@RequestBody grabs the body and builds a CaseRecord object
		try {
			return ResponseEntity.ok(service.update(caseId, record));
		}
		catch(IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
		}
	}
	
	@DeleteMapping("/{caseId}")
	public ResponseEntity<?> delete(@PathVariable String caseId){
		try {
			service.delete(caseId);
			return ResponseEntity.ok().build();
		}
		catch(IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
		}
		
	}
	
}
