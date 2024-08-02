import matplotlib.pyplot as plt

latencies_succeed = [
        6867,
        452,
        435,
        441,
        389,
        393,
        358,
        410,
        370,
        381,
        355,
        363,
        334,
        335,
        347,
        350,
        358,
        321,
        326,
        315,
        304,
        321,
        319,
        340,
        290,
        303,
        296,
        302,
        286,
        463,
        330,
        315,
        299,
        344,
        285,
        310,
        300,
        302,
        295,
        300,
        313,
        296,
        271,
        285,
        272,
        283,
        309,
        289,
        327,
        357,
        278,
        277,
        288,
        268,
        275,
        342,
        267,
        276,
        284,
        275,
        272,
        271,
        275,
        281,
        274,
        293,
        281,
        276,
        276,
        273,
        274,
        275,
        265,
        273,
        281,
        282,
        278,
        270,
        281,
        268,
        269,
        266,
        268,
        278,
        332,
        266,
        279,
        281,
        300,
        284,
        279,
        264,
        274,
        262,
        263,
        265,
        392,
        338,
        382,
        320,
        293
]

latencies_fail = [
        4836,
        259,
        261,
        244,
        269,
        239,
        240,
        238,
        225,
        292,
        268,
        245,
        248,
        224,
        244,
        236,
        265,
        226,
        199,
        230,
        213,
        216,
        223,
        207,
        249,
        211,
        219,
        205,
        215,
        227,
        193,
        190,
        198,
        208,
        205,
        204,
        227,
        196,
        216,
        205,
        220,
        221,
        196,
        205,
        205,
        201,
        210,
        216,
        210,
        198,
        198,
        191,
        215,
        208,
        190,
        214,
        222,
        195,
        207,
        193,
        212,
        204,
        219,
        197,
        228,
        197,
        185,
        212,
        206,
        204,
        187,
        188,
        224,
        199,
        206,
        215,
        187,
        216,
        200,
        194,
        193,
        182,
        203,
        216,
        197,
        211,
        196,
        209,
        232,
        203,
        201,
        196,
        196,
        200,
        187,
        197,
        187,
        192,
        192,
        188,
        199
    ]

average_latency_succeed = sum(latencies_succeed) / len(latencies_succeed)

latencies_succeed_without_outlier = [latency for latency in latencies_succeed if latency != max(latencies_succeed)]
average_latency_succeed_without_outlier = sum(latencies_succeed_without_outlier) / len(latencies_succeed_without_outlier)

average_latency_fail = sum(latencies_fail) / len(latencies_fail)
latencies_fail_without_outlier = [latency for latency in latencies_fail if latency != max(latencies_fail)]
average_latency_fail_without_outlier = sum(latencies_fail_without_outlier) / len(latencies_fail_without_outlier)

fig, axs = plt.subplots(2, 1, figsize=(14, 10))
plt.rcParams.update({'font.size': 13})
plt.rcParams["legend.loc"] = ('upper right')

axs[0].plot(latencies_succeed, marker='.', linestyle='-', color='b', label='Latenzen Erfolgreich (ms)')
axs[0].plot(latencies_fail, marker='.', linestyle='-', color='g', label='Latenzen Abbruch (ms)')
axs[0].axhline(y=average_latency_succeed, color='r', linestyle='--', label=f'Durchschnittliche Latenz Erfolg ({average_latency_succeed:.2f} ms)')
axs[0].axhline(y=average_latency_fail, color='orange', linestyle='--', label=f'Durchschnittliche Latenz Abbruch ({average_latency_fail:.2f} ms)')
#outliers
outlier_indexes_succeed = [i for i, v in enumerate(latencies_succeed) if v == max(latencies_succeed)]
outlier_indexes_fail = [i for i, v in enumerate(latencies_fail) if v == max(latencies_fail)]
outlier_succeed_label = "Kaltstart Erfolg ({f:.2f} ms)".format(f=max(latencies_succeed))
outlier_fail_label = "Kaltstart Abbruch ({f:.2f} ms)".format(f=max(latencies_fail))
axs[0].scatter(outlier_indexes_succeed, [latencies_succeed[i] for i in outlier_indexes_succeed], color='b', s=100, zorder=5, label=outlier_succeed_label)
axs[0].scatter(outlier_indexes_fail, [latencies_fail[i] for i in outlier_indexes_fail], color='g', s=100, zorder=5, label=outlier_fail_label)

axs[0].set_title('Sequentielles 2PC Latenztestszenario ohne minimale Instanzen ohne Parallelität auf Instanzenebene')
axs[0].set_xlabel('Index der Transaktion')
axs[0].set_ylabel('Latenz in Millisekunden (ms)')
axs[0].grid(True)
axs[0].legend()

axs[1].plot(latencies_succeed_without_outlier, marker='.', linestyle='-', color='b', label='Latenzen Erfolgreich (ms)')
axs[1].plot(latencies_fail_without_outlier, marker='.', linestyle='-', color='g', label='Latenzen Abbruch (ms)')
axs[1].axhline(y=average_latency_succeed_without_outlier, color='r', linestyle='--', label=f'Durchschnittliche Latenz Erfolg ({average_latency_succeed_without_outlier:.2f} ms)')
axs[1].axhline(y=average_latency_fail_without_outlier, color='orange', linestyle='--', label=f'Durchschnittliche Latenz Abbruch ({average_latency_fail_without_outlier:.2f} ms)')
axs[1].set_title('Mit Ausreißereliminierung')
axs[1].set_xlabel('Index der Transaktion')
axs[1].set_ylabel('Latenz in Millisekunden (ms)')
axs[1].grid(True)
axs[1].legend()

plt.tight_layout()
plt.show()
