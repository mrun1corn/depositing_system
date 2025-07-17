package com.example.depositapp.ui.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.depositapp.data.model.Deposit
import com.example.depositapp.data.repository.DepositRepository
import kotlinx.coroutines.launch

class DepositViewModel(private val depositRepository: DepositRepository) : ViewModel() {

    private val _deposits = MutableLiveData<List<Deposit>>()
    val deposits: LiveData<List<Deposit>> = _deposits

    private val _operationResult = MutableLiveData<Result<Unit>>()
    val operationResult: LiveData<Result<Unit>> = _operationResult

    fun fetchDeposits() {
        viewModelScope.launch {
            try {
                val response = depositRepository.getAllDeposits()
                if (response.isSuccessful) {
                    _deposits.postValue(response.body())
                } else {
                    _operationResult.postValue(Result.failure(Exception(response.errorBody()?.string() ?: "Failed to fetch deposits")))
                }
            } catch (e: Exception) {
                _operationResult.postValue(Result.failure(e))
            }
        }
    }

    fun addDeposit(deposit: Deposit) {
        viewModelScope.launch {
            try {
                val response = depositRepository.addDeposit(deposit)
                if (response.isSuccessful) {
                    _operationResult.postValue(Result.success(Unit))
                    fetchDeposits() // Refresh data
                } else {
                    _operationResult.postValue(Result.failure(Exception(response.errorBody()?.string() ?: "Failed to add deposit")))
                }
            } catch (e: Exception) {
                _operationResult.postValue(Result.failure(e))
            }
        }
    }

    fun updateDeposit(id: String, deposit: Deposit) {
        viewModelScope.launch {
            try {
                val response = depositRepository.updateDeposit(id, deposit)
                if (response.isSuccessful) {
                    _operationResult.postValue(Result.success(Unit))
                    fetchDeposits() // Refresh data
                } else {
                    _operationResult.postValue(Result.failure(Exception(response.errorBody()?.string() ?: "Failed to update deposit")))
                }
            } catch (e: Exception) {
                _operationResult.postValue(Result.failure(e))
            }
        }
    }

    fun deleteDeposit(id: String) {
        viewModelScope.launch {
            try {
                val response = depositRepository.deleteDeposit(id)
                if (response.isSuccessful) {
                    _operationResult.postValue(Result.success(Unit))
                    fetchDeposits() // Refresh data
                } else {
                    _operationResult.postValue(Result.failure(Exception(response.errorBody()?.string() ?: "Failed to delete deposit")))
                }
            } catch (e: Exception) {
                _operationResult.postValue(Result.failure(e))
            }
        }
    }
}