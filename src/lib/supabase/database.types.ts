
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "budgets": {
                  Row: {
                    "amount_cents": number,"category_id": string | null,"created_at": string,"household_id": string,"id": string,"period": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"category_id"?: string | null,"created_at"?: string,"household_id"?: string,"id"?: string,"period"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"category_id"?: string | null,"created_at"?: string,"household_id"?: string,"id"?: string,"period"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "budgets_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budgets_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "archived": boolean,"color": string,"created_at": string,"household_id": string,"id": string,"name": string,"parent_id": string | null,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"color"?: string,"created_at"?: string,"household_id"?: string,"id"?: string,"name": string,"parent_id"?: string | null,"sort_order"?: number
                  }
                  Update: {
                    "archived"?: boolean,"color"?: string,"created_at"?: string,"household_id"?: string,"id"?: string,"name"?: string,"parent_id"?: string | null,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"expense_lines": {
                  Row: {
                    "amount_cents": number,"category_id": string | null,"description": string,"employee_discount_eligible": boolean | null,"expense_id": string,"household_id": string,"id": string,"product_id": string | null,"quantity": number | null,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"category_id"?: string | null,"description": string,"employee_discount_eligible"?: boolean | null,"expense_id": string,"household_id"?: string,"id"?: string,"product_id"?: string | null,"quantity"?: number | null,"sort_order"?: number
                  }
                  Update: {
                    "amount_cents"?: number,"category_id"?: string | null,"description"?: string,"employee_discount_eligible"?: boolean | null,"expense_id"?: string,"household_id"?: string,"id"?: string,"product_id"?: string | null,"quantity"?: number | null,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "expense_lines_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expense_lines_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: false
      referencedRelation: "expenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expense_lines_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount_cents": number,"category_id": string | null,"created_at": string,"created_by": string | null,"discount_cents": number,"household_id": string,"id": string,"member_id": string | null,"merchant": string,"notes": string | null,"payment_method": string | null,"receipt_id": string | null,"scope": string,"spent_on": string,"store_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"discount_cents"?: number,"household_id"?: string,"id"?: string,"member_id"?: string | null,"merchant": string,"notes"?: string | null,"payment_method"?: string | null,"receipt_id"?: string | null,"scope"?: string,"spent_on": string,"store_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"discount_cents"?: number,"household_id"?: string,"id"?: string,"member_id"?: string | null,"merchant"?: string,"notes"?: string | null,"payment_method"?: string | null,"receipt_id"?: string | null,"scope"?: string,"spent_on"?: string,"store_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_receipt_id_fkey"
      columns: ["receipt_id"]
isOneToOne: false
      referencedRelation: "receipts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"households": {
                  Row: {
                    "created_at": string,"id": string,"invite_code": string,"name": string,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string,"name": string,"timezone"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string,"name"?: string,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inventory_items": {
                  Row: {
                    "expires_on": string | null,"household_id": string,"id": string,"location": string | null,"name": string,"product_id": string | null,"quantity": number | null,"unit": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "expires_on"?: string | null,"household_id"?: string,"id"?: string,"location"?: string | null,"name": string,"product_id"?: string | null,"quantity"?: number | null,"unit"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "expires_on"?: string | null,"household_id"?: string,"id"?: string,"location"?: string | null,"name"?: string,"product_id"?: string | null,"quantity"?: number | null,"unit"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_items_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_plan": {
                  Row: {
                    "created_at": string,"household_id": string,"id": string,"meal": string,"notes": string | null,"plan_date": string,"recipe_id": string | null,"servings": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"household_id"?: string,"id"?: string,"meal": string,"notes"?: string | null,"plan_date": string,"recipe_id"?: string | null,"servings"?: number,"title": string
                  }
                  Update: {
                    "created_at"?: string,"household_id"?: string,"id"?: string,"meal"?: string,"notes"?: string | null,"plan_date"?: string,"recipe_id"?: string | null,"servings"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_plan_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_plan_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "color": string,"created_at": string,"display_name": string,"household_id": string,"id": string,"user_id": string,"weekly_workout_goal": number
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"display_name": string,"household_id": string,"id"?: string,"user_id": string,"weekly_workout_goal"?: number
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"display_name"?: string,"household_id"?: string,"id"?: string,"user_id"?: string,"weekly_workout_goal"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"household_id": string,"id": string,"kind": string,"link": string | null,"member_id": string | null,"read_at": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"household_id"?: string,"id"?: string,"kind": string,"link"?: string | null,"member_id"?: string | null,"read_at"?: string | null,"title": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"household_id"?: string,"id"?: string,"kind"?: string,"link"?: string | null,"member_id"?: string | null,"read_at"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"price_observations": {
                  Row: {
                    "created_at": string,"employee_discount_already_applied": boolean,"household_id": string,"id": string,"label_price_cents": number,"observed_on": string,"product_id": string,"promo_price_cents": number | null,"quantity": number | null,"receipt_id": string | null,"source": string,"source_ref": string | null,"store_id": string,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"employee_discount_already_applied"?: boolean,"household_id"?: string,"id"?: string,"label_price_cents": number,"observed_on": string,"product_id": string,"promo_price_cents"?: number | null,"quantity"?: number | null,"receipt_id"?: string | null,"source": string,"source_ref"?: string | null,"store_id": string,"unit"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"employee_discount_already_applied"?: boolean,"household_id"?: string,"id"?: string,"label_price_cents"?: number,"observed_on"?: string,"product_id"?: string,"promo_price_cents"?: number | null,"quantity"?: number | null,"receipt_id"?: string | null,"source"?: string,"source_ref"?: string | null,"store_id"?: string,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_observations_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_observations_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_observations_receipt_id_fkey"
      columns: ["receipt_id"]
isOneToOne: false
      referencedRelation: "receipts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_observations_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "category_id": string | null,"created_at": string,"default_unit": string | null,"household_id": string,"id": string,"is_habitual": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string,"default_unit"?: string | null,"household_id"?: string,"id"?: string,"is_habitual"?: boolean,"name": string
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string,"default_unit"?: string | null,"household_id"?: string,"id"?: string,"is_habitual"?: boolean,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"receipts": {
                  Row: {
                    "created_at": string,"extraction": Json | null,"household_id": string,"id": string,"mime_type": string,"sha256": string,"size_bytes": number,"status": string,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"extraction"?: Json | null,"household_id"?: string,"id"?: string,"mime_type": string,"sha256": string,"size_bytes": number,"status"?: string,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"extraction"?: Json | null,"household_id"?: string,"id"?: string,"mime_type"?: string,"sha256"?: string,"size_bytes"?: number,"status"?: string,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "receipts_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receipts_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_ingredients": {
                  Row: {
                    "household_id": string,"id": string,"name": string,"product_id": string | null,"quantity": number | null,"recipe_id": string,"sort_order": number,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "household_id"?: string,"id"?: string,"name": string,"product_id"?: string | null,"quantity"?: number | null,"recipe_id": string,"sort_order"?: number,"unit"?: string | null
                  }
                  Update: {
                    "household_id"?: string,"id"?: string,"name"?: string,"product_id"?: string | null,"quantity"?: number | null,"recipe_id"?: string,"sort_order"?: number,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_ingredients_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_ingredients_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recipe_ingredients_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "created_at": string,"household_id": string,"id": string,"instructions": string | null,"is_favorite": boolean,"name": string,"servings": number,"tags": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"household_id"?: string,"id"?: string,"instructions"?: string | null,"is_favorite"?: boolean,"name": string,"servings"?: number,"tags"?: (string)[]
                  }
                  Update: {
                    "created_at"?: string,"household_id"?: string,"id"?: string,"instructions"?: string | null,"is_favorite"?: boolean,"name"?: string,"servings"?: number,"tags"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipes_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"savings_goals": {
                  Row: {
                    "archived": boolean,"created_at": string,"household_id": string,"id": string,"kind": string,"name": string,"target_cents": number | null,"target_date": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"household_id"?: string,"id"?: string,"kind": string,"name": string,"target_cents"?: number | null,"target_date"?: string | null
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"household_id"?: string,"id"?: string,"kind"?: string,"name"?: string,"target_cents"?: number | null,"target_date"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "savings_goals_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"savings_monthly_targets": {
                  Row: {
                    "goal_id": string,"household_id": string,"id": string,"max_cents": number,"min_cents": number,"valid_from": string
                  }
                  ComputedFields: never
                  Insert: {
                    "goal_id": string,"household_id"?: string,"id"?: string,"max_cents": number,"min_cents": number,"valid_from": string
                  }
                  Update: {
                    "goal_id"?: string,"household_id"?: string,"id"?: string,"max_cents"?: number,"min_cents"?: number,"valid_from"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "savings_monthly_targets_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "savings_goals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "savings_monthly_targets_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"savings_movements": {
                  Row: {
                    "amount_cents": number,"concept": string | null,"created_at": string,"goal_id": string,"household_id": string,"id": string,"kind": string,"member_id": string | null,"occurred_on": string,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"concept"?: string | null,"created_at"?: string,"goal_id": string,"household_id"?: string,"id"?: string,"kind": string,"member_id"?: string | null,"occurred_on": string,"reason"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number,"concept"?: string | null,"created_at"?: string,"goal_id"?: string,"household_id"?: string,"id"?: string,"kind"?: string,"member_id"?: string | null,"occurred_on"?: string,"reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "savings_movements_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "savings_goals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "savings_movements_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "savings_movements_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_items": {
                  Row: {
                    "checked": boolean,"checked_by": string | null,"created_at": string,"created_by": string | null,"household_id": string,"id": string,"list_id": string,"name": string,"notes": string | null,"product_id": string | null,"quantity": number | null,"source": string,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "checked"?: boolean,"checked_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"household_id"?: string,"id"?: string,"list_id": string,"name": string,"notes"?: string | null,"product_id"?: string | null,"quantity"?: number | null,"source"?: string,"unit"?: string | null
                  }
                  Update: {
                    "checked"?: boolean,"checked_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"household_id"?: string,"id"?: string,"list_id"?: string,"name"?: string,"notes"?: string | null,"product_id"?: string | null,"quantity"?: number | null,"source"?: string,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_items_checked_by_fkey"
      columns: ["checked_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "shopping_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_lists": {
                  Row: {
                    "created_at": string,"household_id": string,"id": string,"name": string,"status": string,"week_start": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"household_id"?: string,"id"?: string,"name": string,"status"?: string,"week_start"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"household_id"?: string,"id"?: string,"name"?: string,"status"?: string,"week_start"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_lists_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"store_discount_rules": {
                  Row: {
                    "category_id": string | null,"created_at": string,"eligible": boolean,"household_id": string,"id": string,"note": string | null,"product_id": string | null,"source": string,"store_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string,"eligible": boolean,"household_id"?: string,"id"?: string,"note"?: string | null,"product_id"?: string | null,"source"?: string,"store_id": string
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string,"eligible"?: boolean,"household_id"?: string,"id"?: string,"note"?: string | null,"product_id"?: string | null,"source"?: string,"store_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "store_discount_rules_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "store_discount_rules_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "store_discount_rules_store_id_fkey"
      columns: ["store_id"]
isOneToOne: false
      referencedRelation: "stores"
      referencedColumns: ["id"]
    }
                  ]
                },"stores": {
                  Row: {
                    "created_at": string,"discount_confirmed": boolean,"discount_monthly_cap_cents": number | null,"discount_notes": string | null,"discount_stacks_with_promos": boolean | null,"employee_discount_pct": number,"household_id": string,"id": string,"is_supermarket": boolean,"name": string,"travel_note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"discount_confirmed"?: boolean,"discount_monthly_cap_cents"?: number | null,"discount_notes"?: string | null,"discount_stacks_with_promos"?: boolean | null,"employee_discount_pct"?: number,"household_id"?: string,"id"?: string,"is_supermarket"?: boolean,"name": string,"travel_note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"discount_confirmed"?: boolean,"discount_monthly_cap_cents"?: number | null,"discount_notes"?: string | null,"discount_stacks_with_promos"?: boolean | null,"employee_discount_pct"?: number,"household_id"?: string,"id"?: string,"is_supermarket"?: boolean,"name"?: string,"travel_note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stores_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assignee_id": string | null,"category": string | null,"completed_at": string | null,"completed_by": string | null,"created_at": string,"created_by": string | null,"description": string | null,"due_date": string | null,"household_id": string,"id": string,"priority": string,"recurrence": string,"remind_at": string | null,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignee_id"?: string | null,"category"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"household_id"?: string,"id"?: string,"priority"?: string,"recurrence"?: string,"remind_at"?: string | null,"status"?: string,"title": string
                  }
                  Update: {
                    "assignee_id"?: string | null,"category"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"household_id"?: string,"id"?: string,"priority"?: string,"recurrence"?: string,"remind_at"?: string | null,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assignee_id_fkey"
      columns: ["assignee_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_series": {
                  Row: {
                    "activity": string,"created_at": string,"duration_min": number,"ends_on": string | null,"household_id": string,"id": string,"location": string | null,"member_id": string,"start_time": string,"starts_on": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activity": string,"created_at"?: string,"duration_min": number,"ends_on"?: string | null,"household_id"?: string,"id"?: string,"location"?: string | null,"member_id": string,"start_time": string,"starts_on": string,"weekday": number
                  }
                  Update: {
                    "activity"?: string,"created_at"?: string,"duration_min"?: number,"ends_on"?: string | null,"household_id"?: string,"id"?: string,"location"?: string | null,"member_id"?: string,"start_time"?: string,"starts_on"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_series_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workout_series_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"workouts": {
                  Row: {
                    "activity": string,"created_at": string,"duration_min": number | null,"household_id": string,"id": string,"location": string | null,"member_id": string,"notes": string | null,"series_id": string | null,"session_date": string,"start_time": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity": string,"created_at"?: string,"duration_min"?: number | null,"household_id"?: string,"id"?: string,"location"?: string | null,"member_id": string,"notes"?: string | null,"series_id"?: string | null,"session_date": string,"start_time"?: string | null,"status"?: string
                  }
                  Update: {
                    "activity"?: string,"created_at"?: string,"duration_min"?: number | null,"household_id"?: string,"id"?: string,"location"?: string | null,"member_id"?: string,"notes"?: string | null,"series_id"?: string | null,"session_date"?: string,"start_time"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workouts_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workouts_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "workouts_series_id_fkey"
      columns: ["series_id"]
isOneToOne: false
      referencedRelation: "workout_series"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_household":
{ Args: { "p_display_name": string,"p_name": string }; Returns: string
                           },
"current_household_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_member_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"join_household":
{ Args: { "p_code": string,"p_display_name": string }; Returns: string
                           },
"seed_household":
{ Args: { "p_household": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
