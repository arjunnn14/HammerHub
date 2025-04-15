import heapq
import matplotlib.pyplot as plt

# Constants
VEHICLE_TYPES = {'car': 5, 'bus': 10, 'truck': 15}
PRIORITY_LEVELS = {'emergency': 3, 'public': 2, 'regular': 1}
WEIGHTS = (0.6, 2.0, 0.8)  # (1/cross_time, priority, wait_time)

# Example vehicles
EXAMPLE_VEHICLES = [
    {'id': 0, 'vtype': 'car',   'entry_time': 0.0,  'cross_time': 1.0, 'priority': 'regular'},
    {'id': 1, 'vtype': 'truck', 'entry_time': 0.1,  'cross_time': 3.0, 'priority': 'regular'},
    {'id': 2, 'vtype': 'car',   'entry_time': 0.5,  'cross_time': 1.0, 'priority': 'public'},
    {'id': 3, 'vtype': 'car',   'entry_time': 1.0,  'cross_time': 1.0, 'priority': 'emergency'},
]

class Vehicle:
    def __init__(self, vid, vtype, entry_time, cross_time, priority):
        self.id = vid
        self.vtype = vtype
        self.entry_time = entry_time
        self.cross_time = cross_time
        self.priority = PRIORITY_LEVELS[priority]
        self.priority_label = priority
        self.scheduled_time = None

    def compute_score(self, current_time):
        w1, w2, w3 = WEIGHTS
        wait_time = current_time - self.entry_time
        wait_time = max(wait_time, 0)
        score = w1 / self.cross_time + w2 * self.priority + w3 * wait_time
        return score

    def __lt__(self, other):
        return self.id < other.id

class SmartSJFScheduler:
    def __init__(self):
        self.vehicles = []
        self.schedule = []

    def add_vehicle(self, vehicle):
        self.vehicles.append(vehicle)

    def run_schedule(self):
        unscheduled = self.vehicles[:]
        current_time = 0
        while unscheduled:
            best_vehicle = max(unscheduled, key=lambda v: v.compute_score(current_time))
            best_vehicle.scheduled_time = max(current_time, best_vehicle.entry_time)
            current_time = best_vehicle.scheduled_time + best_vehicle.cross_time
            self.schedule.append(best_vehicle)
            unscheduled.remove(best_vehicle)

    def print_schedule(self):
        print("\nSmart Hybrid SJF Scheduled Vehicles:")
        total_tat = 0
        total_wt = 0
        for v in self.schedule:
            tat = v.scheduled_time + v.cross_time - v.entry_time
            wt = v.scheduled_time - v.entry_time
            total_tat += tat
            total_wt += wt
            print(f"Vehicle {v.id} ({v.vtype}, {v.priority_label}) | Entry: {v.entry_time:.1f}s | Scheduled: {v.scheduled_time:.1f}s | "
                  f"CrossTime: {v.cross_time:.1f}s | TAT: {tat:.1f}s | WT: {wt:.1f}s")

        avg_tat = total_tat / len(self.schedule)
        avg_wt = total_wt / len(self.schedule)
        print(f"\nSmart SJF Average Turnaround Time: {avg_tat:.2f}s")
        print(f"Smart SJF Average Waiting Time: {avg_wt:.2f}s")

    def plot_gantt_chart(self):
        fig, ax = plt.subplots(figsize=(8, 3))
        for idx, v in enumerate(self.schedule):
            ax.barh(y=idx, width=v.cross_time, left=v.scheduled_time, height=0.4,
                    color='lightgreen', edgecolor='black')
            ax.text(v.scheduled_time + v.cross_time / 2, idx, f"V{v.id}",
                    ha='center', va='center', color='black', fontsize=8)

        ax.set_yticks(range(len(self.schedule)))
        ax.set_yticklabels([f"V{v.id}" for v in self.schedule])
        ax.set_xlabel("Time (s)")
        ax.set_title("Gantt Chart - Smart Hybrid SJF")
        plt.tight_layout()
        plt.grid(True, axis='x', linestyle='--', alpha=0.6)
        plt.show()

# --- Run Smart Hybrid SJF ---
scheduler = SmartSJFScheduler()
for v in EXAMPLE_VEHICLES:
    vehicle = Vehicle(v['id'], v['vtype'], v['entry_time'], v['cross_time'], v['priority'])
    scheduler.add_vehicle(vehicle)

scheduler.run_schedule()
scheduler.print_schedule()
scheduler.plot_gantt_chart()
