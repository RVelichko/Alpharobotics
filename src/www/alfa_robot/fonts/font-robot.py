#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Copyright & copy; 2016, Metaller.
# \file   font-roboto.css
# \brief  Извлекает урлы шрифтов из файла и выкачивает на локальную машину.
# \author Величко Н.Н.
# \date   21.06.2016

import os
import re
import sys
import subprocess
import urllib.request

# переменная адресса
addr = ''

def insPokets():
    # проверка наличия git
    if os.path.exists('/usr/bin/pip3'):
        pass
    else:
        subprocess.call(['sudo','apt-get', 'install', 'git'])
        
    # проверка наличия pip3
    if os.path.exists('/usr/bin/pip3'):
        pass
    else:
        subprocess.call(['sudo','apt-get', 'install', 'python3-pip'])
    
    # провнряем наличие декомпрессора woff2
    if os.path.exists('/usr/bin/woff2_decompress'):
        pass
    else:
        print('Скачиваю исходники woff2 декомпрессора.')
        subprocess.call(['git', 'clone', '--recursive', 'https://github.com/google/woff2.git'])
        os.chdir('woff2/')
        print('Собираю исходники woff2 декомпрессора.')
        subprocess.call(['make', 'clean', 'all'])
        print('Перенашу бинарник woff2 декомпрессора в директорию: /usr/bin/')
        subprocess.call(['sudo', 'mv', 'woff2_decompress', '/usr/bin/'])
        os.chdir('../')
        print('Стираю созданную дирректорию woff2')
        subprocess.call(['rm', '-rf', 'woff2/'])
    
# функция проверки существования рабочего файла, если да, извлекаем данные из файла
def fileReed(fileName):
    urlList = ''
    if os.path.exists(fileName):
        file = open(fileName, 'r') 
        text = file.read()
        file.close()
        # извлекаем из файла все урлы шрифтов в list
        urlList = re.findall('url\(([\w\d\:\/\_\-\.]+)\)', text)
        crFonts(text, urlList)
    else:
        print('Передан фаил:'+fileName)
        print('Нет такого фаила или каталога.')
        sys.exit (1)
    
# функция извлечения имени шрифта ttf
FONT_SPECIFIER_NAME_ID = 4
def shortName(font):
    name = ''
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
    
# функция создания шрифтов
def crFonts(t, urlL):
    # переходим в заданную дирректорию
    if addr == '':
        pass
    elif addr != '' and os.path.exists(addr):
        os.chdir(addr)
    else:
        print('Ошибка, дирректория указана неправильно')
        sys.exit (1)
        
    # создаём директорию
    try:
        os.makedirs('fonts')
        print('Создана дирректория fonts.')
    except OSError:
        print('Дирректория fonts уже создана.')
        pass
    
    # цикл проходит по эллементам list'а
    for i in range(len(urlL)):
        # скачивает файлы на локальную машину
        logo = urllib.request.urlopen(urlL[i]).read()
        netAdr = urlL[i]
        woffName = 'fonts/'+str(i)+'.woff2'
        woffFile = open(woffName, 'wb')
        woffFile.write(logo)
        woffFile.close()
        # распаковывает .woff2 в .tff
        subprocess.call(['woff2_decompress', woffName])
        # извлекает информацию о шрифте(имя, кол-во графов)
        ttfName = 'fonts/'+str(i)+'.ttf'
        fontData = ttLib.TTFont(ttfName)
        rwoffName = shortName(fontData)
        rwoffName = rwoffName.replace(' ', '_')
        nwoffName = 'fonts/'+rwoffName+'_'+str(fontData['maxp'].numGlyphs)+'.woff2'
        # переименовывает файлы woff2 шрифтов согласно полученной информации
        os.rename(woffName, nwoffName)
        # удаляет ненужные файлы tff
        os.remove(ttfName)
        # замена внешнего адреса шрифтов на созданный (локальный)
        t = t.replace(netAdr, nwoffName)
        print('Создан шрифт:', nwoffName)
        
    # запись отредактированного файла
    file = open('font-robot.css', 'w')
    file.write(t) 
    file.close()
    print('Создан фаил: font-robot.css')
    
# Условия работы скрипта
if len (sys.argv) == 1:
    insPokets()
    # провнряем наличие библиотеки fontTools
    try:
        from fontTools import ttLib
    except ImportError:
        subprocess.call(['sudo', 'pip3', 'install', 'fonttools'])
        print('Копмоненты установлены, теперь можно воспользоваться программой.')
        sys.exit (1)
    fileReed('font-roboto.css')
elif len (sys.argv) < 3:
    if (sys.argv[1] == '-p'):
        print('Не указана директория!')
        print('Пример: -p your/dir/')
        print('        -h - вывод помощи')
        sys.exit (1)
    elif(sys.argv[1] == '-h'):
        print('Для корректной работы, необходимо предоставить root права.')
        print('При первом запуске программа докачиваает необходимые для работы библиотеки')
        print('Программа обработывает URL шрифтов в каскадных таблицах стилей, скачивает  их ')
        print('в дирректорию fonts, создаёт фаил font-robot.css с изменёнными URL на локальные')
        print('При запуске программы без параметров, считывается фаил font-roboto.css')
        print('Использование: -h - вывод помощи')
        print('               -p - задать дирректорию для записи шрифтов')
        sys.exit (1)
    else:
        insPokets()
        # провнряем наличие библиотеки fontTools
        try:
            from fontTools import ttLib
        except ImportError:
            subprocess.call(['sudo', 'pip3', 'install', 'fonttools'])
            print('Копмоненты установлены, теперь можно воспользоваться программой.')
            sys.exit (1)
        fileReed(sys.argv[1])
elif len (sys.argv) < 4:
    if (sys.argv[1] == '-p'):
        insPokets()
        addr = sys.argv[2]
        fileReed('font-roboto.css')
    elif(sys.argv[1] == '-h'):
        print('Для корректной работы, необходимо предоставить root права.')
        print('При первом запуске программа докачиваает необходимые для работы библиотеки')
        print('Программа обработывает URL шрифтов в каскадных таблицах стилей, скачивает  их ')
        print('в дирректорию fonts, создаёт фаил font-robot.css с изменёнными URL на локальные')
        print('При запуске программы без параметров, считывается фаил font-roboto.css')
        print('Использование: -h - вывод помощи')
        print('               -p - задать дирректорию для записи шрифтов')
        sys.exit (1)
    else:
        print('Ошибка, параметры указаны неверно.')
        print('Пример: somefile -p your/dir/')
        print('        -h - вывод помощи')
        sys.exit (1)
else:
    if len (sys.argv)   > 4:
        print('Ошибка. Слишком много параметров.')
        print('Пример: somefile -p your/dir/')
        print('        -h - вывод помощи')
        sys.exit (1)
        
    if (sys.argv[1] == '-p'):
        print('В начале нужно указать рабочий фаил.')
        print('Пример: somefile -p your/dir/')
        print('        -h - вывод помощи')
        sys.exit (1)
    elif (sys.argv[3] == '-p'):
        print('В конце нужно указать директорию.')
        print('Пример: somefile -p your/dir/')
        print('        -h - вывод помощи')
        sys.exit (1)
    else:
        insPokets()
        # провнряем наличие библиотеки fontTools
        try:
            from fontTools import ttLib
        except ImportError:
            subprocess.call(['sudo', 'pip3', 'install', 'fonttools'])
            print('Копмоненты установлены, теперь можно воспользоваться программой.')
            sys.exit (1)
        addr = sys.argv[3]
        fileReed(sys.argv[1])

# сообщение завершения работы
print('Работа завершена.')
