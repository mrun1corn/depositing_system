package com.example.depositapp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.depositapp.data.repository.DepositRepository

class DepositViewModelFactory(private val depositRepository: DepositRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(DepositViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return DepositViewModel(depositRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}