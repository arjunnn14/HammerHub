import heapq
import matplotlib.pyplot as plt

# Constants
VEHICLE_TYPES = {'car': 5, 'bus': 10, 'truck': 15}

# Example vehicles from paper (same data for FCFS and SJF)
EXAMPLE_VEHICLES = [
    {'id': 0, 'vtype': 'car',   'entry_time': 0.0,  'cross_time': 1.0},
    {'id': 1, 'vtype': 'truck', 'entry_time': 0.1,  'cross_time': 3.0},
    {'id': 2, 'vtype': 'car',   'entry_time': 0.5,  'cross_time': 1.0},
    {'id': 3, 'vtype': 'car',   'entry_time': 1.0,  'cross_time': 1.0},
]

class Vehicle:
    def __init__(self, vid, vtype, entry_time, cross_time):
        self.id = vid
        self.vtype = vtype
        self.entry_time = entry_time
        self.cross_time = cross_time
        self.scheduled_time = None

    def __lt__(self, other):
        return self.id < other.id

class Scheduler:
    def __init__(self, policy='SJF'):
        self.policy = policy  # 'SJF' or 'FCFS'
        self.vehicles = []
        self.schedule = []

    def add_vehicle(self, vehicle):
        self.vehicles.append(vehicle)

    def run_schedule(self):
        if self.policy == 'FCFS':
            self.vehicles.sort(key=lambda v: v.entry_time)
        elif self.policy == 'SJF':
            self.vehicles.sort(key=lambda v: v.cross_time)

        current_time = 0
        for v in self.vehicles:
            v.scheduled_time = max(current_time, v.entry_time)
            self.schedule.append(v)
            current_time = v.scheduled_time + v.cross_time

    def print_schedule(self):
        print(f"\n{self.policy} Scheduled Vehicles:")
        total_tat = 0
        total_wt = 0
        for v in self.schedule:
            tat = v.scheduled_time + v.cross_time - v.entry_time
            wt = v.scheduled_time - v.entry_time
            total_tat += tat
            total_wt += wt
            print(f"Vehicle {v.id} ({v.vtype}) | Entry: {v.entry_time:.1f}s | Scheduled: {v.scheduled_time:.1f}s | "
                  f"CrossTime: {v.cross_time:.1f}s | TAT: {tat:.1f}s | WT: {wt:.1f}s")

        avg_tat = total_tat / len(self.schedule)
        avg_wt = total_wt / len(self.schedule)
        print(f"\n{self.policy} Average Turnaround Time: {avg_tat:.2f}s")
        print(f"{self.policy} Average Waiting Time: {avg_wt:.2f}s")

    def plot_gantt_chart(self):
        fig, ax = plt.subplots(figsize=(8, 3))
        for idx, v in enumerate(self.schedule):
            ax.barh(y=idx, width=v.cross_time, left=v.scheduled_time, height=0.4,
                    color='skyblue', edgecolor='black')
            ax.text(v.scheduled_time + v.cross_time / 2, idx, f"V{v.id}",
                    ha='center', va='center', color='black', fontsize=8)

        ax.set_yticks(range(len(self.schedule)))
        ax.set_yticklabels([f"V{v.id}" for v in self.schedule])
        ax.set_xlabel("Time (s)")
        ax.set_title(f"Gantt Chart - {self.policy}")
        plt.tight_layout()
        plt.grid(True, axis='x', linestyle='--', alpha=0.6)
        plt.show()

# --- Run FCFS and SJF ---
fcfs_scheduler = Scheduler(policy='FCFS')
sjf_scheduler = Scheduler(policy='SJF')

for data in EXAMPLE_VEHICLES:
    v1 = Vehicle(data['id'], data['vtype'], data['entry_time'], data['cross_time'])
    v2 = Vehicle(data['id'], data['vtype'], data['entry_time'], data['cross_time'])
    fcfs_scheduler.add_vehicle(v1)
    sjf_scheduler.add_vehicle(v2)

fcfs_scheduler.run_schedule()
sjf_scheduler.run_schedule()

fcfs_scheduler.print_schedule()
sjf_scheduler.print_schedule()

fcfs_scheduler.plot_gantt_chart()
sjf_scheduler.plot_gantt_chart()
