package com.example.depositapp.ui.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.depositapp.R
import com.example.depositapp.data.model.Deposit

class DepositAdapter(private val deposits: MutableList<Deposit>, private val onItemClick: (Deposit) -> Unit) :
    RecyclerView.Adapter<DepositAdapter.DepositViewHolder>() {

    class DepositViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val amountTextView: TextView = view.findViewById(R.id.amountTextView)
        val dateTextView: TextView = view.findViewById(R.id.dateTextView)
        val methodTextView: TextView = view.findViewById(R.id.methodTextView)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DepositViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_deposit, parent, false)
        return DepositViewHolder(view)
    }

    override fun onBindViewHolder(holder: DepositViewHolder, position: Int) {
        val deposit = deposits[position]
        holder.amountTextView.text = "Amount: ${deposit.amount}"
        holder.dateTextView.text = "Date: ${deposit.paymentDate}"
        holder.methodTextView.text = "Method: ${deposit.paymentMethod}"
        holder.itemView.setOnClickListener { onItemClick(deposit) }
    }

    override fun getItemCount() = deposits.size

    fun updateDeposits(newDeposits: List<Deposit>) {
        deposits.clear()
        deposits.addAll(newDeposits)
        notifyDataSetChanged()
    }
}