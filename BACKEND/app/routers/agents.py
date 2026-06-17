from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, crud
from app.auth import get_current_active_user

router = APIRouter(prefix="/agents", tags=["Agents"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

@router.post("/", response_model=schemas.AgentOut)
def create_agent(payload: schemas.AgentCreate, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(get_current_active_user)):
    existing = crud.get_agent_by_name(db, payload.name.strip(), owner_id=current_user.id)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Já existe um agente com esse nome."
        )
    try:
        return crud.create_agent(db, payload, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=list[schemas.AgentOut])
def list_agents(db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(get_current_active_user)):
    return crud.list_agents(db, user_id=current_user.id)

@router.get("/{agent_id}", response_model=schemas.AgentOut)
def get_agent(agent_id: int, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(get_current_active_user)):
    agent = crud.get_agent(db, agent_id)
    if not agent or agent.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Agente não encontrado."
        )
    return agent

@router.put("/{agent_id}", response_model=schemas.AgentOut)
def update_agent(agent_id: int, payload: schemas.AgentUpdate, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(get_current_active_user)):
    agent = crud.get_agent(db, agent_id)
    if not agent or agent.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Agente não encontrado."
        )
    return crud.update_agent(db, agent, payload)

@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(get_current_active_user)):
    agent = crud.get_agent(db, agent_id)
    if not agent or agent.owner_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Agente não encontrado."
        )
    crud.delete_agent(db, agent)