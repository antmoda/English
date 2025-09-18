document.addEventListener('DOMContentLoaded', function() {
            const themeToggleBtn = document.getElementById('theme-toggle');
            const themeIcon = themeToggleBtn.querySelector('.theme-icon');
            
            // Перевіряємо збережену тему або використовуємо системні налаштування
            const savedTheme = localStorage.getItem('theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
                document.body.classList.add('dark-theme');
                themeIcon.textContent = '☀️';
            } else {
                themeIcon.textContent = '🌙';
            }
            
            // Обробник кліку по кнопці
            themeToggleBtn.addEventListener('click', function() {
                document.body.classList.toggle('dark-theme');
                
                if (document.body.classList.contains('dark-theme')) {
                    localStorage.setItem('theme', 'dark');
                    themeIcon.textContent = '☀️';
                } else {
                    localStorage.setItem('theme', 'light');
                    themeIcon.textContent = '🌙';
                }
            });
        });
