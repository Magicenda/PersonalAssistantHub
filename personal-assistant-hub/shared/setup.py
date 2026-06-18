from setuptools import setup, find_packages

setup(
    name="shared",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "sqlalchemy>=2.0",
        "pydantic>=2.0",
        "pydantic[email]",
        "pyjwt>=2.0",
        "fastapi>=0.109",
    ],
)
