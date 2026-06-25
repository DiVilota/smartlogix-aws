# SmartLogix - Sistema de Gestion Logistica

## Arquitectura en AWS EKS

```
                        ┌─────────────────────────────────┐
                        │          Route 53 / DNS          │
                        └──────────────┬──────────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────────┐
                        │   Application Load Balancer     │
                        │   (ALB Ingress Controller)      │
                        │   internet-facing               │
                        └──────────────┬──────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
    │   Frontend :80   │   │ API Gateway :8080 │   │ API Gateway :8080 │
    │   (React)        │   │ (Spring Cloud)    │   │ (Spring Cloud)    │
    │   replica: 1     │   │ replica: 2..6     │   │ replica: 2..6     │
    └──────────────────┘   └────────┬─────────┘   └────────┬─────────┘
                                    │                       │
              ┌──────────┬──────────┼──────────┬───────────┤
              ▼          ▼          ▼          ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Auth    │ │   BFF    │ │Inventario│ │ Pedidos  │ │  Envios  │
    │  :8085   │ │  :8084   │ │  :8081   │ │  :8082   │ │  :8083   │
    │reps:2..6│ │reps:2..6│ │reps:2..6│ │reps:2..6│ │reps:2..6│
    └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │            │            │
         └────────────┼────────────┴────────────┼────────────┘
                      │                         │
                      ▼                         ▼
            ┌──────────────────────────────────────────────┐
            │          PostgreSQL (StatefulSet)            │
            │          postgres-db:5432                    │
            │          PVC 10Gi (gp2)                      │
            │          DB: smartlogix_local                │
            └──────────────────────────────────────────────┘
```

## Infraestructura AWS (Terraform)

### Recursos creados

| Recurso | Descripcion |
|---|---|
| **VPC** | CIDR `10.0.0.0/16`, 2 subnets publicas + 2 privadas en `us-east-1a` y `us-east-1b` |
| **NAT Gateway** | 1 NAT Gateway en subnet publica para acceso saliente de las subnets privadas |
| **EKS Cluster** | Kubernetes 1.30 con control plane administrado, endpoint publico |
| **Node Group** | `t3.medium` SPOT, 2-5 nodos, en subnets privadas |
| **ECR** | 7 repositorios con lifecycle policy (keep last 5 images) |
| **IAM** | Roles para EKS cluster, node group, LB Controller, y GitHub Actions |
| **ALB Controller** | AWS Load Balancer Controller via Helm (internet-facing) |
| **Metrics Server** | Para HPA (Horizontal Pod Autoscaler) |

### Comandos Terraform

```bash
cd terraform

# Inicializar
terraform init

# Planificar (ver que se creara sin aplicarlo)
terraform plan

# Crear toda la infraestructura
terraform apply -auto-approve

# Ver outputs (Account ID, ECR URLs, etc.)
terraform output

# Obtener comando para configurar kubectl
terraform output configure_kubectl
```

## Microservicios

| Servicio | Puerto | Descripcion | Replicas (HPA) |
|---|---|---|---|
| **api-gateway** | 8080 | Proxy + JWT + CORS + ALB Ingress | 2..6 (CPU 70%) |
| **auth-service** | 8085 | Login/Register (JPA) | 2..6 (CPU 70%) |
| **bff-service** | 8084 | KPIs y Dashboard | 2..6 (CPU 70%) |
| **inventario-service** | 8081 | Productos y Stocks | 2..6 (CPU 70%) |
| **pedidos-service** | 8082 | Pedidos con Saga Pattern | 2..6 (CPU 70%) |
| **envios-service** | 8083 | Envios con tracking | 2..6 (CPU 70%) |
| **frontend-smartlogix** | 80 | React + Vite + Tailwind | 2..6 (CPU 70%) |

## Stack Tecnologico

### Backend
- Java 17 / Spring Boot 4.0.4
- Spring MVC (Servlet), Spring Data JPA + Hibernate
- PostgreSQL 15 (dentro del cluster EKS)
- JWT (jjwt 0.11.5), OpenAPI / Swagger (springdoc 2.5.0)

### Frontend
- React 19.2.5 / Vite 8.0.9 / Tailwind CSS 4.2.4
- Vitest + React Testing Library, Context API

### Infraestructura
- AWS EKS 1.30 + Terraform + Helm
- Application Load Balancer (ALB Ingress Controller)
- Horizontal Pod Autoscaler (HPA)
- GitHub Actions para CI/CD

## Pipeline CI/CD

```
Git Push (main)
       │
       ▼
┌──────────────────────────────────────┐
│ 1. AWS Credentials (OIDC / Secrets) │
│ 2. Docker Build (7 imagenes)        │
│ 3. Push to Amazon ECR               │
│ 4. Create K8s Secrets (from GH)     │
│ 5. kubectl apply (7 manifests)      │
│ 6. Verify + Show Ingress URL        │
└──────────────────────────────────────┘
```

### GitHub Secrets requeridos

| Secret | Descripcion |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS Academy / Learner Lab access key |
| `AWS_SECRET_ACCESS_KEY` | AWS Academy secret key |
| `AWS_SESSION_TOKEN` | AWS Academy session token |
| `AWS_REGION` | `us-east-1` |
| `EKS_CLUSTER` | Nombre del cluster (`smartlogix-cluster`) |
| `JWT_SECRET` | Clave secreta para firma de tokens JWT |
| `DB_USER` | Usuario PostgreSQL |
| `DB_PASSWORD` | Password PostgreSQL |

## Ejecucion Local

### Docker Compose

```bash
docker compose up --build -d
```

### Frontend

```bash
cd frontend-smartlogix
npm install
npm run dev
```

### Tests

```bash
# Backend (por servicio)
cd <service> && ./mvnw test

# Frontend
cd frontend-smartlogix && npm test
```

## Despliegue en AWS (flujo completo)

```bash
# 1. Clonar e inicializar
git clone <repo-url> && cd smartlogix-aws

# 2. Crear infraestructura con Terraform
cd terraform
terraform init
terraform apply -auto-approve

# 3. Configurar kubectl
aws eks update-kubeconfig --region us-east-1 --name smartlogix-cluster

# 4. Desplegar aplicacion
kubectl apply -f k8s/

# 5. Obtener URL publica
kubectl get ingress -n smartlogix

# 6. Configurar GitHub Secrets (ver lista arriba)

# 7. Push a main para activar CI/CD automatico
git push origin main
```

## Patrones de Diseno

| Patron | Ubicacion | Descripcion |
|---|---|---|
| **API Gateway** | `api-gateway` | Punto unico de entrada con proxy |
| **BFF** | `bff-service` | Agrega datos de multiples servicios |
| **Saga Pattern** | `pedidos-service` | Orquestacion con compensacion |
| **Feign/RestTemplate** | `bff-service`, `pedidos-service` | Comunicacion entre servicios |
| **Global Exception Handler** | Todos los servicios | Manejo centralizado de errores |

## API Endpoints

### Auth Service (`/auth`)
| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| POST | `/auth/login` | No | Login con JWT |
| POST | `/auth/register` | No | Registrar usuario |

### Inventario Service (`/api`)
| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| GET | `/api/productos` | JWT | Listar productos |
| POST | `/api/productos` | JWT | Crear producto |
| GET | `/api/stocks` | JWT | Listar stocks |
| POST | `/api/stocks/entrada` | JWT | Agregar stock |
| POST | `/api/stocks/salida` | JWT | Reducir stock |

### Pedidos Service (`/api`)
| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| GET | `/api/pedidos` | JWT | Listar pedidos |
| POST | `/api/pedidos` | JWT | Crear pedido (Saga) |
| GET | `/api/pedidos/{id}` | JWT | Detalle pedido |
| PUT | `/api/pedidos/{id}/completar` | JWT | Completar saga |
| PUT | `/api/pedidos/{id}/compensar` | JWT | Cancelar (restaura stock) |

### Envios Service (`/api`)
| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| POST | `/api/envios/pedido/{id}` | JWT | Crear envio |
| GET | `/api/envios/pedido/{id}` | JWT | Consultar envio |
| PUT | `/api/envios/{id}/estado` | JWT | Actualizar estado |

### BFF Service (`/api`)
| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| GET | `/api/bff/kpis` | JWT | KPIs consolidados |
| GET | `/api/bff/dashboard` | JWT | Dashboard completo |

## Swagger UI

| Servicio | URL |
|---|---|
| auth-service | http://localhost:8085/swagger-ui.html |
| bff-service | http://localhost:8084/swagger-ui.html |
| inventario-service | http://localhost:8081/swagger-ui.html |
| pedidos-service | http://localhost:8082/swagger-ui.html |
| envios-service | http://localhost:8083/swagger-ui.html |

## Estados del Saga (Pedidos)

```
Nuevo -> PROCESADO --> [Completar] -> COMPLETADO
           |
           └--> [Cancelar] -> CANCELLED (restaura stock)
```

## Flujo de Envios

```
PREPARACION -> EN_TRANSITO -> ENTREGADO
```

## Roles de Usuario

| Usuario | Password | Rol |
|---|---|---|
| diego | admin123 | ROLE_ADMIN |
| cliente | 1234 | ROLE_CLIENTE |

## Cobertura de Tests

| Componente | Tests |
|---|---|
| auth-service | 3 |
| bff-service | 1 |
| inventario-service | 23 (10 stock, 13 integration) |
| pedidos-service | 5 (3 web + 2 model) |
| envios-service | 8 (6 service + 2 integration) |
| **Frontend (Vitest)** | **40** |
| **Total** | **80** |

## Arquitectura de Autoscaling

```
HPA (Horizontal Pod Autoscaler) - 7 servicios
├── api-gateway-hpa        CPU 70%   2..6
├── auth-service-hpa       CPU 70%   2..6
├── bff-service-hpa        CPU 70%   2..6
├── inventario-service-hpa CPU 70%   2..6
├── pedidos-service-hpa    CPU 70%   2..6
├── envios-service-hpa     CPU 70%   2..6
└── frontend-hpa           CPU 70%   2..6

Cluster Autoscaler (Node Group)
├── Min: 2  |  Max: 5  |  Instance: t3.medium SPOT
└── Metricas: CPU + Memoria del nodo
```
