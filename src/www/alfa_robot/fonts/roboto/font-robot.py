# -*- coding: utf-8 -*-

# Copyright &copy; 2016.
# \file   font-roboto.css
# \brief  Скачивает по URL файлы шрифтов из .CSS на локальную машину, переименовывает по содержанию, редактирует URL в .css на локальный адресс.
# \author Величко Н.Н.
# \date   07.06.2016

import os
import re
import urllib.request
import subprocess

from fontTools import ttLib

# имя рабочего файла
fileName = 'font-roboto.css'


# функция извлечения имени шрифта ttf
FONT_SPECIFIER_NAME_ID = 4
#FONT_SPECIFIER_FAMILY_ID = 1
def shortName( font ):
    """Get the short name from the font's names table"""
    name = ""
    for record in font['name'].names:
        if b'\x00' in record.string:
            name_str = record.string.decode('utf-16-be')
        else:   
            name_str = record.string.decode('utf-8')
        if record.nameID == FONT_SPECIFIER_NAME_ID and not name:
            name = name_str
        if name: 
            break
    return name

# функция извлечения имени и семейство шрифта ttf
# import sys
# from fontTools import ttLib
# 
# FONT_SPECIFIER_NAME_ID = 4
# FONT_SPECIFIER_FAMILY_ID = 1
# def shortName( font ):
#     """Get the short name from the font's names table"""
#     name = ""
#     family = ""
#     for record in font['name'].names:
#         if b'\x00' in record.string:
#             name_str = record.string.decode('utf-16-be')
#         else:   
#             name_str = record.string.decode('utf-8')
#         if record.nameID == FONT_SPECIFIER_NAME_ID and not name:
#             name = name_str
#         elif record.nameID == FONT_SPECIFIER_FAMILY_ID and not family: 
#             family = name_str
#         if name and family: break
#     return name, family
# 
# tt = ttLib.TTFont(sys.argv[1])
# print("Name: %s  Family: %s" % shortName(tt))

# создаёт дирректорию
try:
    os.makedirs('fonts')
    print('Создана дирректория fonts.')
except OSError:
    pass

# чтение файла
file = open(fileName, 'r') 
text = file.read()
file.close()

# извлекаем из файла все урлы шрифтов
urlList = re.findall('url\(([\w\d\:\/\_\-\.]+)\)', text)

# цикл проходит по эллементам list'а
for i in range(len(urlList)):
    # скачивает файлы на локальную машину
    logo = urllib.request.urlopen(urlList[i]).read()
    netAdr = urlList[i]
    woffName = 'fonts/'+str(i)+'.woff2'
    woffFile = open(woffName, 'wb')
    woffFile.write(logo)
    woffFile.close()
    # распаковывает .woff2 в .tff
    subprocess.call(['./woff2_decompress', woffName])
    # извлекает информацию о шрифте(имя, кол-во графов)
    ttfName = 'fonts/'+str(i)+'.ttf'
    fontData = ttLib.TTFont(ttfName)
    nwoffName = 'fonts/'+shortName(fontData)+' '+str(fontData['maxp'].numGlyphs)+'.woff2'
    # переименовывает файлы woff2 шрифтов согласно полученной информации
    os.rename(woffName, nwoffName)
    # удаляет ненужные файлы tff
    os.remove(ttfName)
    # замена внешнего адреса шрифтов на созданный (локальный)
    text = text.replace(netAdr, nwoffName)
#    print(netAdr)
    print('Создан шрифт:', shortName(fontData), fontData['maxp'].numGlyphs)
    
    
# запись отредактированного файла
file = open('font-robot.css', 'w')
file.write(text) 
file.close()
print('Создана фаил: font-robot.css.')

# сообщение завершения работы
print('Работа завершена без ошибок.')
            
