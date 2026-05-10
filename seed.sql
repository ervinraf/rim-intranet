-- ============================================================
-- SEED INICIAL — Intranet RIM Rigging
-- Ejecutar en phpMyAdmin en la BD rimriggi_intranet
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ─── ROLES ────────────────────────────────────────────────
INSERT INTO `Role` (`id`, `name`, `description`, `isSystem`, `createdAt`) VALUES
('q7sedjx8xsqvzuxp9xwtx', 'SUPERADMIN', 'Acceso total al sistema', 1, NOW()),
('o8p2fq49sq8572grhsc1b', 'ADMIN', 'Administrador de empresa', 1, NOW()),
('3jpjdwqu1boqwx8tsr22eq', 'GERENTE', 'Gerente de departamento', 1, NOW()),
('7wsp7wruqwvgvcs6cizev4', 'EMPLEADO', 'Empleado operativo', 1, NOW()),
('tqwnaowno8qdmprg2r5adc', 'CLIENTE', 'Cliente externo', 1, NOW());

-- ─── DEPARTAMENTOS ────────────────────────────────────────
INSERT INTO `Department` (`id`, `name`, `isActive`, `createdAt`, `updatedAt`) VALUES
('jt5xi3stt6gavb5ij7ase', 'Recursos Humanos', 1, NOW(), NOW()),
('5gbcc8p8vfv79jhdcuzs53', 'Administracion', 1, NOW(), NOW()),
('urw070wztar6umufwipy', 'Ventas', 1, NOW(), NOW()),
('wkdca8hvzijay8ytl73t8', 'Operaciones', 1, NOW(), NOW()),
('klz3d23sgyjsfk4j229eve', 'Almacen', 1, NOW(), NOW()),
('ck939sblvnlwm883dzxj7j', 'Taller', 1, NOW(), NOW());

-- ─── USUARIO ADMIN ────────────────────────────────────────
INSERT INTO `User` (`id`, `email`, `name`, `passwordHash`, `isActive`, `createdAt`, `updatedAt`) VALUES
('9oam6o4zvlgovni8fmnsa', 'admin@rim-rigging.com', 'Administrador', '$2b$10$PLBGaMDh7WzmUsowN8tz9OisCamvUTfLAeX1iaimMKu3QYma/usqS', 1, NOW(), NOW());

INSERT INTO `Employee` (`id`, `userId`, `paterno`, `nombres`, `fullName`, `employeeType`, `departmentId`, `roleId`, `isActive`, `createdAt`, `updatedAt`) VALUES
('1bmpmd7ruiumteqhyr7th', '9oam6o4zvlgovni8fmnsa', 'Admin', 'Sistema', 'Administrador Sistema', 'ADMINISTRATIVO', 'jt5xi3stt6gavb5ij7ase', 'q7sedjx8xsqvzuxp9xwtx', 1, NOW(), NOW());

-- ─── CONFIGURACION DEL SISTEMA ────────────────────────────
INSERT INTO `SystemConfig` (`key`, `value`, `description`, `updatedAt`) VALUES
('company_name', 'RIM Rigging', 'Nombre de la empresa', NOW()),
('hours_bank_expiration_months', '6', 'Meses para vencimiento del banco de horas (0 = nunca)', NOW()),
('overtime_weekly_limit', '9', 'Limite de horas extras semanales antes de aplicar triple', NOW()),
('overtime_double_multiplier', '2', 'Multiplicador horas dobles', NOW()),
('overtime_triple_multiplier', '3', 'Multiplicador horas triples', NOW()),
('working_hours_per_day', '8', 'Horas de jornada laboral', NOW());

-- ─── CATEGORIAS DE DOCUMENTOS ─────────────────────────────
INSERT INTO `DocumentCategory` (`id`, `name`, `createdAt`) VALUES
(REPLACE(UUID(),'-',''), 'Descripcion de puestos', NOW()),
(REPLACE(UUID(),'-',''), 'Perfiles de empleado', NOW()),
(REPLACE(UUID(),'-',''), 'Formatos de nuevo ingreso', NOW()),
(REPLACE(UUID(),'-',''), 'Formatos de vacaciones', NOW()),
(REPLACE(UUID(),'-',''), 'Control EPP', NOW()),
(REPLACE(UUID(),'-',''), 'Control tiempo extra', NOW()),
(REPLACE(UUID(),'-',''), 'Cierre de periodo horas extras', NOW()),
(REPLACE(UUID(),'-',''), 'Nomina', NOW()),
(REPLACE(UUID(),'-',''), 'Ausencias y descuentos', NOW()),
(REPLACE(UUID(),'-',''), 'Aumentos de puesto y salariales', NOW()),
(REPLACE(UUID(),'-',''), 'Facturacion y cobranza', NOW()),
(REPLACE(UUID(),'-',''), 'Pagos IMSS e impuestos', NOW()),
(REPLACE(UUID(),'-',''), 'Pagos a proveedores', NOW()),
(REPLACE(UUID(),'-',''), 'Contratos REPSE', NOW()),
(REPLACE(UUID(),'-',''), 'Proyectos', NOW()),
(REPLACE(UUID(),'-',''), 'Calendario de proyectos', NOW()),
(REPLACE(UUID(),'-',''), 'Formatos de levantamiento', NOW()),
(REPLACE(UUID(),'-',''), 'Formatos de cierre de proyecto', NOW()),
(REPLACE(UUID(),'-',''), 'Satisfaccion del cliente', NOW()),
(REPLACE(UUID(),'-',''), 'DC3 por empleado', NOW()),
(REPLACE(UUID(),'-',''), 'Listados de equipos', NOW()),
(REPLACE(UUID(),'-',''), 'Listados de herramientas', NOW()),
(REPLACE(UUID(),'-',''), 'Listados de colaboradores', NOW()),
(REPLACE(UUID(),'-',''), 'Formatos check list', NOW()),
(REPLACE(UUID(),'-',''), 'Bitacoras de equipo', NOW()),
(REPLACE(UUID(),'-',''), 'Vales de salida', NOW()),
(REPLACE(UUID(),'-',''), 'Herramienta solicitada', NOW()),
(REPLACE(UUID(),'-',''), 'Hojas tecnicas del equipo', NOW()),
(REPLACE(UUID(),'-',''), 'Bitacoras de servicio', NOW()),
(REPLACE(UUID(),'-',''), 'Entrega y recepcion de equipos', NOW()),
(REPLACE(UUID(),'-',''), 'Solicitud de reparacion', NOW());

-- ─── CATALOGO EPP ─────────────────────────────────────────
INSERT INTO `EPPCatalog` (`id`, `name`, `isActive`) VALUES
(REPLACE(UUID(),'-',''), 'Casco de seguridad', 1),
(REPLACE(UUID(),'-',''), 'Botas de seguridad con casquillo', 1),
(REPLACE(UUID(),'-',''), 'Arnes de cuerpo completo', 1),
(REPLACE(UUID(),'-',''), 'Eslingas de seguridad', 1),
(REPLACE(UUID(),'-',''), 'Guantes de trabajo', 1),
(REPLACE(UUID(),'-',''), 'Guantes de cuero', 1),
(REPLACE(UUID(),'-',''), 'Lentes de seguridad', 1),
(REPLACE(UUID(),'-',''), 'Careta de seguridad', 1),
(REPLACE(UUID(),'-',''), 'Chaleco de seguridad reflectante', 1),
(REPLACE(UUID(),'-',''), 'Protectores auditivos', 1),
(REPLACE(UUID(),'-',''), 'Mascarilla respiratoria', 1),
(REPLACE(UUID(),'-',''), 'Rodilleras', 1),
(REPLACE(UUID(),'-',''), 'Faja lumbar', 1),
(REPLACE(UUID(),'-',''), 'Cubre piernas', 1),
(REPLACE(UUID(),'-',''), 'Ropa de trabajo (uniforme)', 1),
(REPLACE(UUID(),'-',''), 'Impermeable', 1);

-- ─── PERMISOS BASE ────────────────────────────────────────
INSERT INTO `Permission` (`id`, `module`, `action`, `description`) VALUES
(REPLACE(UUID(),'-',''), 'users', 'create', 'Crear usuarios'),
(REPLACE(UUID(),'-',''), 'users', 'read', 'Ver usuarios'),
(REPLACE(UUID(),'-',''), 'users', 'update', 'Editar usuarios'),
(REPLACE(UUID(),'-',''), 'users', 'delete', 'Eliminar usuarios'),
(REPLACE(UUID(),'-',''), 'documents', 'create', 'Subir documentos'),
(REPLACE(UUID(),'-',''), 'documents', 'read', 'Ver documentos'),
(REPLACE(UUID(),'-',''), 'documents', 'update', 'Editar documentos'),
(REPLACE(UUID(),'-',''), 'documents', 'delete', 'Eliminar documentos'),
(REPLACE(UUID(),'-',''), 'overtime', 'create', 'Registrar horas extras'),
(REPLACE(UUID(),'-',''), 'overtime', 'read', 'Ver horas extras'),
(REPLACE(UUID(),'-',''), 'overtime', 'approve', 'Aprobar horas extras'),
(REPLACE(UUID(),'-',''), 'projects', 'create', 'Crear proyectos'),
(REPLACE(UUID(),'-',''), 'projects', 'read', 'Ver proyectos'),
(REPLACE(UUID(),'-',''), 'projects', 'update', 'Editar proyectos'),
(REPLACE(UUID(),'-',''), 'inventory', 'create', 'Agregar inventario'),
(REPLACE(UUID(),'-',''), 'inventory', 'read', 'Ver inventario'),
(REPLACE(UUID(),'-',''), 'inventory', 'update', 'Editar inventario'),
(REPLACE(UUID(),'-',''), 'config', 'read', 'Ver configuracion'),
(REPLACE(UUID(),'-',''), 'config', 'update', 'Editar configuracion');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- FIN DEL SEED
-- Login inicial: admin@rim-rigging.com / RimRigging2026!
-- ============================================================
