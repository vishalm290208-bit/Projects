# Personal Finance Tracker (FINAL FIX WITH DELETE + UI SIZE)

import tkinter as tk
from tkinter import ttk, messagebox
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pymongo import MongoClient
from bson.objectid import ObjectId

# ------------------ MongoDB Setup ------------------
client = MongoClient("mongodb://localhost:27017/")
db = client["finance_db"]
collection = db["transactions"]

# ------------------ Load Dataset ------------------
file_path = r"C:\PYTHON\personal_expense_dataset.csv"

df = pd.read_csv(file_path, sep=None, engine='python')
df.columns = df.columns.str.strip()

if len(df.columns) == 1:
    df = df[df.columns[0]].str.split(expand=True)
    df.columns = ['Date', 'Category', 'Amount']

# Clean data
df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce')
df = df.dropna()

if collection.count_documents({}) == 0:
    collection.insert_many(df.to_dict("records"))

# Store IDs separately for deletion
record_ids = []

# ------------------ Functions ------------------

def add_transaction():
    try:
        record = {
            "Date": pd.to_datetime(entry_date.get()),
            "Category": entry_category.get(),
            "Amount": float(entry_amount.get())
        }
        collection.insert_one(record)
        view_data()
    except:
        messagebox.showerror("Error", "Invalid input")


def view_data():
    listbox.delete(0, tk.END)
    record_ids.clear()

    data = list(collection.find({}, {'Date': 1, 'Category': 1, 'Amount': 1}))

    for item in data:
        record_ids.append(item['_id'])
        listbox.insert(tk.END, f"{item.get('Date')} | {item.get('Category')} | {item.get('Amount')}")


def analyze_data():
    data = list(collection.find({}, {'_id': 0}))
    df_local = pd.DataFrame(data)

    if df_local.empty:
        messagebox.showerror("Error", "No data")
        return

    total = np.sum(df_local['Amount'])
    avg = np.mean(df_local['Amount'])
    minimum = np.min(df_local['Amount'])
    maximum = np.max(df_local['Amount'])

    messagebox.showinfo("Analysis", 
                        f"Total = {total}\nAverage = {avg}\nMin Spend = {minimum}\nMax Spend = {maximum}")

    category_sum = df_local.groupby('Category')['Amount'].sum()

    plt.figure()
    category_sum.plot(kind='bar')
    plt.title("Category Spending")
    plt.show()


def pie_chart():
    data = list(collection.find({}, {'_id': 0}))
    df_local = pd.DataFrame(data)

    if df_local.empty:
        messagebox.showerror("Error", "No data")
        return

    category_sum = df_local.groupby('Category')['Amount'].sum()

    plt.figure()
    category_sum.plot(kind='pie', autopct='%1.1f%%')
    plt.title("Spending Distribution")
    plt.ylabel('')
    plt.show()


def delete_selected():
    try:
        index = listbox.curselection()[0]
        record_id = record_ids[index]

        collection.delete_one({"_id": record_id})
        view_data()
    except:
        messagebox.showerror("Error", "Select a row")


def delete_all():
    collection.delete_many({})
    view_data()

# ------------------ GUI ------------------
root = tk.Tk()
root.title("Finance Tracker")
root.geometry("700x650")

frame = tk.Frame(root)
frame.pack(pady=10)

# Inputs
tk.Label(frame, text="Date").grid(row=0, column=0)
entry_date = tk.Entry(frame)
entry_date.grid(row=0, column=1)

tk.Label(frame, text="Category").grid(row=1, column=0)
entry_category = ttk.Combobox(frame, values=["Food","Transport","Rent","Shopping","Entertainment","Utilities","Health"])
entry_category.grid(row=1, column=1)

tk.Label(frame, text="Amount").grid(row=2, column=0)
entry_amount = tk.Entry(frame)
entry_amount.grid(row=2, column=1)

# Buttons
btn_frame = tk.Frame(root)
btn_frame.pack(pady=10)

tk.Button(btn_frame, text="Add", width=15, command=add_transaction).grid(row=0, column=0, padx=5)
tk.Button(btn_frame, text="View", width=15, command=view_data).grid(row=0, column=1, padx=5)
tk.Button(btn_frame, text="Analyze", width=15, command=analyze_data).grid(row=0, column=2, padx=5)
tk.Button(btn_frame, text="Pie Chart", width=15, command=pie_chart).grid(row=0, column=3, padx=5)

tk.Button(btn_frame, text="Delete Selected", width=20, command=delete_selected).grid(row=1, column=0, pady=5)
tk.Button(btn_frame, text="Delete All", width=20, command=delete_all).grid(row=1, column=1, pady=5)

# Listbox (EXPANDED FULL SCREEN)
listbox = tk.Listbox(root, font=("Arial", 10))
listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

root.mainloop()