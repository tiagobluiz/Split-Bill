package com.splitbill.backend

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class SplitBillApplication

fun main(args: Array<String>) {
	runApplication<SplitBillApplication>(*args)
}
