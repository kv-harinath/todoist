import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_db
from app.models.project import Project
from app.models.section import Section
from app.schemas.section import SectionCreate, SectionRead, SectionUpdate

router = APIRouter(tags=["sections"])


async def _get_owned_project(project_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Project:
    project = await db.get(Project, project_id)
    if project is None or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _get_owned_section(section_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Section:
    section = await db.get(Section, section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="Section not found")
    project = await db.get(Project, section.project_id)
    if project is None or project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Section not found")
    return section


@router.get("/projects/{project_id}/sections", response_model=list[SectionRead])
async def list_sections(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    await _get_owned_project(project_id, user_id, db)
    result = await db.execute(
        select(Section).where(Section.project_id == project_id).order_by(Section.sort_order)
    )
    return result.scalars().all()


@router.post("/projects/{project_id}/sections", response_model=SectionRead, status_code=201)
async def create_section(
    project_id: uuid.UUID,
    payload: SectionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    await _get_owned_project(project_id, user_id, db)
    max_sort = await db.scalar(
        select(func.max(Section.sort_order)).where(Section.project_id == project_id)
    )
    section = Section(project_id=project_id, sort_order=(max_sort or 0) + 1, **payload.model_dump())
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return section


@router.patch("/sections/{section_id}", response_model=SectionRead)
async def update_section(
    section_id: uuid.UUID,
    payload: SectionUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    section = await _get_owned_section(section_id, user_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(section, field, value)
    await db.commit()
    await db.refresh(section)
    return section


@router.delete("/sections/{section_id}", status_code=204)
async def delete_section(
    section_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    section = await _get_owned_section(section_id, user_id, db)
    await db.delete(section)
    await db.commit()
