# - Find mysqlclient
# Find the native WTCPP includes and library
#
#  WTCPP_INCLUDE_DIR          - where to find *.h, etc.
#  WTCPP_LIBRARIES            - List of libraries when using WTCPP.
#  WTCPP_FOUND                - True if WTCPP found.

include(${CMAKE_DIR}/TakeComponent.cmake)
find_template(COMPONENT_NAME WT           INCLUDE_NAMES "Wt/WApplication" LIB_NAMES wt           libwt          )
find_template(COMPONENT_NAME WTHTTP       INCLUDE_NAMES "Wt/WApplication" LIB_NAMES wthttp       libwthttp      )
#find_template(COMPONENT_NAME WTDBO        INCLUDE_NAMES "Wt/WApplication" LIB_NAMES wtdbo        libwdbo        )
#find_template(COMPONENT_NAME WTDBOSQLITE3 INCLUDE_NAMES "Wt/WApplication" LIB_NAMES wtdbosqlite3 libwtdbosqlite3)
find_template(COMPONENT_NAME WTEXT        INCLUDE_NAMES "Wt/WApplication" LIB_NAMES wtext        libwtext       )
set(WTCPP_INCLUDE_DIR ${WT_INCLUDE_DIR})
set(WTCPP_LIBRARIES   ${WT_LIBRARIES} ${WTHTTP_LIBRARIES} ${WTDBO_LIBRARIES} ${WTDBOSQLITE3_LIBRARIES} ${WTEXT_LIBRARIES})
set(WTCPP_FOUND       WT_FOUND AND WTHTTP_FOUND AND WTDBO_FOUND AND WTDBOSQLITE3_FOUND AND WTEXT_FOUND)
