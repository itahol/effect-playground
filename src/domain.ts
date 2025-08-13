import { Brand, Data, Schema } from "effect";

// Helper to convert null to undefined
const nullToUndefined = <A>(schema: Schema.Schema<A>) =>
  Schema.NullOr(schema).pipe(
    Schema.transform(
      Schema.Union(schema, Schema.Undefined),
      {
        strict: true,
        decode: (value) => value === null ? undefined : value,
        encode: (value) => value === undefined ? null : value
      }
    )
  );

export class OktaError extends Data.TaggedError("OktaError")<{
  cause?: unknown;
  message?: string;
}> {}

export type UserId = string & Brand.Brand<"UserId">;
export const UserId = Brand.nominal<UserId>();
export const UserIdSchema = Schema.String.pipe(Schema.brand("UserId"));

export type GroupId = string & Brand.Brand<"GroupId">;
export const GroupId = Brand.nominal<GroupId>();
export const GroupIdSchema = Schema.String.pipe(Schema.brand("GroupId"));

export class GroupNotFoundError extends Data.TaggedError("GroupNotFoundError")<{
  groupId: GroupId;
  cause?: unknown;
}> {}

export const UserStatusSchema = Schema.Literal(
  "STAGED",
  "PROVISIONED",
  "ACTIVE",
  "RECOVERY",
  "LOCKED_OUT",
  "PASSWORD_EXPIRED",
  "SUSPENDED",
  "DEPROVISIONED"
);

// Okta User Profile schema
export const UserProfileSchema = Schema.Struct({
  firstName: Schema.optional(nullToUndefined(Schema.String)),
  lastName: Schema.optional(nullToUndefined(Schema.String)),
  email: Schema.optional(Schema.String),
  login: Schema.optional(Schema.String),
  mobilePhone: Schema.optional(nullToUndefined(Schema.String)),
  displayName: Schema.optional(nullToUndefined(Schema.String)),
  department: Schema.optional(Schema.String),
  title: Schema.optional(nullToUndefined(Schema.String)),
  city: Schema.optional(nullToUndefined(Schema.String)),
  state: Schema.optional(nullToUndefined(Schema.String)),
  countryCode: Schema.optional(nullToUndefined(Schema.String)),
  zipCode: Schema.optional(nullToUndefined(Schema.String)),
  employeeNumber: Schema.optional(Schema.String),
  costCenter: Schema.optional(nullToUndefined(Schema.String)),
  organization: Schema.optional(nullToUndefined(Schema.String)),
  division: Schema.optional(nullToUndefined(Schema.String)),
  manager: Schema.optional(nullToUndefined(Schema.String)),
  managerId: Schema.optional(nullToUndefined(Schema.String)),
  primaryPhone: Schema.optional(nullToUndefined(Schema.String)),
  secondEmail: Schema.optional(nullToUndefined(Schema.String)),
  locale: Schema.optional(Schema.String),
  timezone: Schema.optional(nullToUndefined(Schema.String)),
  userType: Schema.optional(nullToUndefined(Schema.String))
});

// User Credentials schema
export const UserCredentialsSchema = Schema.Struct({
  password: Schema.optional(nullToUndefined(Schema.Record({ key: Schema.String, value: Schema.Unknown }))),
  provider: Schema.optional(nullToUndefined(Schema.Record({ key: Schema.String, value: Schema.Unknown }))),
  recovery_question: Schema.optional(nullToUndefined(Schema.Record({ key: Schema.String, value: Schema.Unknown })))
});

// Okta User schema
export const OktaUserSchema = Schema.Struct({
  id: Schema.optional(UserIdSchema),
  created: Schema.optional(Schema.DateFromSelf),
  activated: Schema.optional(nullToUndefined(Schema.DateFromSelf)),
  lastLogin: Schema.optional(nullToUndefined(Schema.DateFromSelf)),
  lastUpdated: Schema.optional(Schema.DateFromSelf),
  passwordChanged: Schema.optional(nullToUndefined(Schema.DateFromSelf)),
  statusChanged: Schema.optional(nullToUndefined(Schema.DateFromSelf)),
  status: Schema.optional(UserStatusSchema),
  profile: Schema.optional(UserProfileSchema),
  realmId: Schema.optional(Schema.String),
  credentials: Schema.optional(UserCredentialsSchema),
  _links: Schema.optional(nullToUndefined(Schema.Record({ key: Schema.String, value: Schema.Unknown })))
});

export const GroupTypeSchema = Schema.Literal("OKTA_GROUP", "APP_GROUP", "BUILT_IN");

// Okta Group Profile schema
export const GroupProfileSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.NullOr(Schema.String)),
  externalId: Schema.optional(Schema.NullOr(Schema.String))
});

export const OktaGroupSchema = Schema.Struct({
  id: Schema.optional(GroupIdSchema),
  created: Schema.optional(Schema.DateFromSelf),
  lastMembershipUpdated: Schema.optional(Schema.DateFromSelf),
  lastUpdated: Schema.optional(Schema.DateFromSelf),
  type: Schema.optional(GroupTypeSchema),
  profile: Schema.optional(GroupProfileSchema),
  objectClass: Schema.optional(Schema.Array(Schema.String)),
  _links: Schema.optional(nullToUndefined(Schema.Record({ key: Schema.String, value: Schema.Unknown })))
});

export type UserStatus = typeof UserStatusSchema.Type;
export type UserProfile = typeof UserProfileSchema.Type;
export type UserCredentials = typeof UserCredentialsSchema.Type;
export type OktaUser = typeof OktaUserSchema.Type;
export type GroupType = typeof GroupTypeSchema.Type;
export type GroupProfile = typeof GroupProfileSchema.Type;
export type OktaGroup = typeof OktaGroupSchema.Type;
