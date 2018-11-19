
# Поиск включаемых файлов и библиотеки JSONCpp
# В модуле определяются:
#  JSONCPP_FOUND -- имеется ли в системе libjsoncpp.
#  JSONCPP_INCLUDE_DIRS -- диреткории включаемых файлов libjsoncpp.
#  JSONCPP_LIBRARIES -- библиотеки libjsoncpp.

find_package(PkgConfig)
pkg_check_modules(PC_JSONCPP jsoncpp)

find_path(JSONCPP_INCLUDE_DIR json/reader.h
  HINTS ${PC_JSONCPP_INCLUDE_DIR} ${PC_JSONCPP_INCLUDE_DIRS}
  PATH_SUFFIXES jsoncpp
)

# Получаем версию компилятора GGC.
exec_program(${CMAKE_CXX_COMPILER}
  ARGS ${CMAKE_CXX_COMPILER_ARG1} -dumpversion
  OUTPUT_VARIABLE _gcc_COMPILER_VERSION
  OUTPUT_STRIP_TRAILING_WHITESPACE
)

# Пытаемся найти библиотеку, которая была построена с той же версией компилятора, которую используем мы.
find_library(JSONCPP_LIBRARY
  NAMES libjson_linux-gcc-${_gcc_COMPILER_VERSION}_libmt.a libjsoncpp.a
  HINTS ${PC_JSONCPP_LIBDIR} ${PC_JSONCPP_LIBRARY_DIRS}
  PATHS /usr/lib /usr/local/lib
)

set(JSONCPP_LIBRARIES ${JSONCPP_LIBRARY})
set(JSONCPP_INCLUDE_DIRS ${JSONCPP_INCLUDE_DIR})
set(JSONCPP_STATIC_LIBRARIES ${PC_JSONCPP_STATIC_LIBRARIES})

include(FindPackageHandleStandardArgs)
find_package_handle_standard_args(JSONCPP DEFAULT_MSG JSONCPP_LIBRARY JSONCPP_INCLUDE_DIR)

mark_as_advanced(JSONCPP_LIBRARY JSONCPP_INCLUDE_DIR JSONCPP_STATIC_LIBRARIES)
