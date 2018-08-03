import csv
import json
import re

def parse_req(string):
    if string.lower().count('either') > 1:
        print('WARN (MULTI EITHER): ' + string)
    obj = split_note(string)
    if obj['main'] is not None:
        obj['main'] = split_prereq(obj['main'])

    return obj


def split_prereq(string):
    either_index = None
    and_index = None
    try:
        either_index = string.lower().index('either')
    except ValueError:
        pass
    try:
        and_index = string.lower().index(' and ')
    except ValueError:
        pass

    if either_index is not None and and_index is not None:
        if either_index < and_index:
            return split_either(string)
        else:
            return split_and(string)
    elif either_index is not None:
        return split_either(string)
    elif and_index is not None:
        return split_and(string)
    else:
        return make_atom(string)


def split_either(string):
    arr = re.split(r'\([a-z]\)', string)[1:]  # cut part before (a)
    return {"either": [split_prereq(x) for x in arr]}


def split_and(string):
    arr = string.split(' and ', 1)
    return {"and": [split_prereq(x) for x in arr]}


def make_atom(string):
    courses = re.findall(r'[A-Z]{3,4}[ ]*[\d]{1,3}', string)
    courses = [x.replace(' ', '') for x in courses]
    match = re.search(r'(all|one|two|three|four|five|six|seven) of', string.lower())
    op = None
    if match:
        op = match.group(1).lower()
    else:
        if len(courses) is not 1:
            print("WARN (UNEXPECTED # OF COURSES): " + string)
        else:
            op = "only"
            courses = courses
    obj = {}
    obj[op] = courses
    return obj


def split_note(string):
    if string is '':
        return {"main": None, "note": None}
    left = 0
    note_start = None
    while left < len(string):
        try:
            left = string.index('(', left)
        except ValueError:
            return {"main": string, "note": None}
        if left + 2 < len(string) and string[left + 2] is not ')':
            note_start = left
            break
        else:
            left = left + 3
    if note_start is not None:
        sub = string[:left].strip()
        main = sub if sub is not '' else None
        sub = string[left:].strip()
        note = sub if sub is not '' else None
        return {"main": main, "note": note}
    else:
        return {"main": string, "note": None}


objects = {}

with open('data.csv', newline='') as infile:
    reader = csv.reader(infile)
    headerRead = False
    for row in reader:
        if not headerRead:
            headerRead = True
        else:
            try:
                p_parsed = parse_req(row[15])
                c_parsed = parse_req(row[16])
                objects[row[0]+row[1]] = {"dept": row[0],
                    "id": row[1],
                    "shortname": row[5],
                    "longname": row[6],
                    "description": row[7],
                    "degree": row[12],
                    "prereqs": p_parsed['main'],
                    "prereq note": p_parsed['note'],
                    "prereq original": row[15],
                    "coreqs": c_parsed['main'],
                    "coreq note": c_parsed['note'],
                    "coreq original": row[16]}

            except:
                print('WARN (EXCEPTION): ' + row)

with open('data.json', 'w+') as outfile:
    outfile.write(json.dumps(objects, sort_keys=True, indent=4))
