import os
from pkg import fn


class Job:
    def run(self, items):
        total = len(items)
        for item in items:
            if item:
                print(item)


def build(name):
    result = fn(name)
    return result
