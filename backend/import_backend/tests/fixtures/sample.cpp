#include <iostream>
#include <vector>

class Example {
public:
    int add(int a, int b) const {
        return a + b;
    }
};

int main() {
    Example example;
    std::vector<int> values = {1, 2, 3};
    std::cout << example.add(values[0], values[1]) << std::endl;
    return 0;
}
