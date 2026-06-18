from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth import get_current_user_id
from app.models import Task
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskReorderRequest

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    project_id: int | None = Query(None),
    search: str | None = Query(None),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).where(Task.user_id == user_id)

    if status_filter:
        query = query.where(Task.status == status_filter.upper())
    if priority:
        query = query.where(Task.priority == priority.upper())
    if project_id:
        query = query.where(Task.project_id == project_id)
    if search:
        query = query.where(Task.title.ilike(f"%{search}%"))

    query = query.order_by(Task.order_index, Task.created_at)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    task = Task(
        user_id=user_id,
        project_id=body.project_id,
        title=body.title,
        description=body.description,
        priority=body.priority.upper() if body.priority else "MEDIUM",
        status=body.status.upper() if body.status else "TODO",
        deadline=body.deadline,
        order_index=body.order_index or 0,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.patch("/reorder", response_model=list[TaskResponse])
async def reorder_tasks(
    body: TaskReorderRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    updated_tasks = []
    for item in body.items:
        result = await db.execute(select(Task).where(Task.id == item.id, Task.user_id == user_id))
        task = result.scalar_one_or_none()
        if task:
            task.order_index = item.order_index
            if item.status:
                task.status = item.status.upper()
            updated_tasks.append(task)
    await db.commit()
    for t in updated_tasks:
        await db.refresh(t)
    return updated_tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    body: TaskUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    update_data = body.model_dump(exclude_unset=True)
    if "priority" in update_data and update_data["priority"]:
        update_data["priority"] = update_data["priority"].upper()
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].upper()
    for key, value in update_data.items():
        setattr(task, key, value)
    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    await db.delete(task)
    await db.commit()
