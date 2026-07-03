package demo;

import java.util.List;

class Job {
  void run(List<String> items) {
    int total = items.size();
    for (String item : items) {
      if (item != null) {
        log(item);
      }
    }
  }
}
