import sys, csv, datetime, os.path

FIELDS = ["Anime", "Song", "Artist", "Song Type", "Link", "Time"]

first_write = True if not os.path.isfile("output.csv") else False

with open("output.csv", "a", encoding="utf-8") as data:
    file = csv.writer(data)
    if first_write:
        file.writerow(FIELDS)
    file.writerow(
        [
            sys.argv[1],
            sys.argv[2],
            sys.argv[3],
            sys.argv[4],
            sys.argv[5],
            f"{datetime.datetime.now()}",
        ]
    )
