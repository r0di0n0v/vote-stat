# vote-stat
Скрипт собирает результаты голосоввания с нескольких страниц сайта,
формирует простую html страницу с результатами и фильтрами по категориям,
и размещает страницу со статистикой на хостинге.

Замечания по коду:
- Блоки с отключеным линтером: async внутри for;
- Блоки с отключеным линтером: итерация по обьекту без проверки hasOwnProperty;
- Глобальный обьект stat;
- Сборка html в коде через шаблонные строки, допустимо, нет необходимости в шаблонизаторе на простой странице;
- Отсутствует обработка ошибок и retry операций
