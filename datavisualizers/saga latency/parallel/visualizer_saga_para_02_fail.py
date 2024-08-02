import matplotlib.pyplot as plt
import json
import numpy as np

def load_latency_data_from_json(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data['durationsTotal']

json_file_path = '25_50_saga_fail.json'

#latenzen
latency_data = load_latency_data_from_json(json_file_path)

plt.figure(figsize=(14, 7))
plt.rcParams.update({'font.size': 13})
plt.rcParams["legend.loc"] = ('upper right')

elim_batches = 0

#batch averages
average_latencies = [np.mean(batch) for batch in latency_data[elim_batches:]]

#kaltstartwerte
first_batch_average = sum(latency_data[0]) / 25
first_batch_min = np.min(latency_data[0])
first_batch_max = np.max(latency_data[0])

boxplot = plt.boxplot(
    latency_data[elim_batches:],
    vert=True,
    patch_artist=True,
    showfliers=True,
    flierprops=dict(markerfacecolor='red', marker='o', markersize=5, linestyle='none', alpha=0.7),
    medianprops=dict(color='blue', linewidth=3)
)

colors = ['red']
for i in range(1, len(average_latencies)):
    if average_latencies[i] < average_latencies[i - 1]:
        colors.append('green')
    else:
        colors.append('red')

#box colors
for patch, color in zip(boxplot['boxes'], colors):
    patch.set_facecolor(color)
    patch.set_alpha(0.7)

average_latency_average = sum(average_latencies) / len(average_latencies)

# Set outlier colors to light blue
for flier in boxplot['fliers']:
    flier.set(markerfacecolor='lightblue', marker='o', markersize=5, linestyle='none', alpha=0.7)


plt.title('Sequentiell paralleles Saga Latenztestszenario mit Umgebungsparametern, fehlgeschlagen')
plt.xlabel('Index der Batch an Transaktionen')
plt.ylabel('Latenz in Millisekunden (ms)')
plt.axhline(y=average_latency_average, color='b', linestyle='--')

num_batches = len(latency_data)
tick_frequency = max(0, num_batches // 5)

plt.xticks(
    ticks=range(1, num_batches + 1, tick_frequency),
    labels=[str(i - 1) for i in range(1, num_batches + 1, tick_frequency)],
    rotation=45,
    ha='center'
)

plt.grid(axis='y', linestyle='--', alpha=0.7)

handles = [plt.Line2D([0], [0], color='green', lw=4),
           plt.Line2D([0], [0], color='red', lw=4),
           plt.Line2D([0], [0], color='b', linestyle='--', lw=2)]
labels = ['Niedrigere Latenz als vorherige Batch', 'Höhere Latenz als vorherige Batch', f'Durchschnittliche Latenz gesamt ({average_latency_average:.2f} ms)']
plt.legend(handles, labels)

plt.tight_layout()
plt.show()