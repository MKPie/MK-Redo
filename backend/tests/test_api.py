import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_root():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "MK Processor Backend"

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
    # API should always be healthy
    assert "api" in response.json()

@pytest.mark.asyncio
async def test_projects_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/projects")
    assert response.status_code == 200
    assert "projects" in response.json()
    assert len(response.json()["projects"]) == 4
