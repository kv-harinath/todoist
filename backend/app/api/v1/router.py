from fastapi import APIRouter

from app.api.v1 import auth, filters, labels, projects, push, reminders, sections, stats, tasks, views

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(sections.router)
api_router.include_router(tasks.router)
api_router.include_router(labels.router)
api_router.include_router(filters.router)
api_router.include_router(views.router)
api_router.include_router(stats.router)
api_router.include_router(reminders.router)
api_router.include_router(push.router)
