@echo off
for /r %%i in (*) do (
    echo ======================== %%i start ========================
    type %%i
    echo,
    echo ======================== %%i end ========================
)