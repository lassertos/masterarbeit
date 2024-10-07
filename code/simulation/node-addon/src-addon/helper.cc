#include "helper.h"

std::vector<std::string> split(const std::string &s, const std::string &delimiter)
{
    std::vector<std::string> tokens;
    std::string copy = s;
    size_t pos = 0;
    std::string token;
    while ((pos = copy.find(delimiter)) != std::string::npos)
    {
        token = copy.substr(0, pos);
        tokens.push_back(token);
        copy.erase(0, pos + delimiter.length());
    }
    tokens.push_back(copy);

    return tokens;
}