# Пример добавления теста:
# add_unit_test(<Имя теста> <библиотека 1>  ... <библиотека N>)

#message(STATUS "Test targets")
include(${CMAKE_DIR}/UTest.cmake)

add_unit_test(ut_boost_regex log boost_regex)
