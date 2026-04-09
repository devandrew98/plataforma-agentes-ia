from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, crud

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.post("/", response_model=schemas.AgentOut)
def create_agent(payload: schemas.AgentCreate, db: Session = Depends(get_db)):
    existing = crud.get_agent_by_name(db, payload.name.strip())
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Já existe um agente com esse nome."
        )
    return crud.create_agent(db, payload)


@router.get("/", response_model=list[schemas.AgentOut])
def list_agents(db: Session = Depends(get_db)):
    return crud.list_agents(db)


@router.get("/{agent_id}", response_model=schemas.AgentOut)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(
            status_code=404,
            detail="Agente não encontrado."
        )
    return agent


@router.put("/{agent_id}", response_model=schemas.AgentOut)
def update_agent(
    agent_id: int,
    payload: schemas.AgentUpdate,
    db: Session = Depends(get_db)
):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(
            status_code=404,
            detail="Agente não encontrado."
        )
    return crud.update_agent(db, agent, payload)


@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = crud.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(
            status_code=404,
            detail="Agente não encontrado."
        )
    crud.delete_agent(db, agent)
    return {"deleted": True}