export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytical_accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
        }
        Relationships: []
      }
      auto_analytical_models: {
        Row: {
          analytical_account_id: string
          budget_id: string | null
          created_at: string
          id: string
          is_archived: boolean
          name: string
          partner_id: string | null
          partner_tag_id: string | null
          priority: number
          product_category_id: string | null
          product_id: string | null
          status: string
        }
        Insert: {
          analytical_account_id: string
          budget_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          partner_id?: string | null
          partner_tag_id?: string | null
          priority?: number
          product_category_id?: string | null
          product_id?: string | null
          status?: string
        }
        Update: {
          analytical_account_id?: string
          budget_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          partner_id?: string | null
          partner_tag_id?: string | null
          priority?: number
          product_category_id?: string | null
          product_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_analytical_models_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_analytical_models_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_analytical_models_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_analytical_models_partner_tag_id_fkey"
            columns: ["partner_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_analytical_models_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_analytical_models_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["payment_mode"]
          notes: string | null
          payment_date: string
          payment_number: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string | null
          vendor_bill_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["payment_mode"]
          notes?: string | null
          payment_date?: string
          payment_number: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string | null
          vendor_bill_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          notes?: string | null
          payment_date?: string
          payment_number?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string | null
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_revisions: {
        Row: {
          budget_id: string
          created_at: string
          id: string
          new_amount: number
          previous_amount: number
          reason: string | null
          revision_date: string
        }
        Insert: {
          budget_id: string
          created_at?: string
          id?: string
          new_amount: number
          previous_amount: number
          reason?: string | null
          revision_date?: string
        }
        Update: {
          budget_id?: string
          created_at?: string
          id?: string
          new_amount?: number
          previous_amount?: number
          reason?: string | null
          revision_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_revisions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          achieved_amount: number
          achievement_percentage: number
          analytical_account_id: string
          budgeted_amount: number
          created_at: string
          end_date: string
          id: string
          is_archived: boolean
          name: string
          parent_budget_id: string | null
          remaining_balance: number
          start_date: string
          state: Database["public"]["Enums"]["budget_state"]
          type: Database["public"]["Enums"]["budget_type"]
          updated_at: string
        }
        Insert: {
          achieved_amount?: number
          achievement_percentage?: number
          analytical_account_id: string
          budgeted_amount: number
          created_at?: string
          end_date: string
          id?: string
          is_archived?: boolean
          name: string
          parent_budget_id?: string | null
          remaining_balance?: number
          start_date: string
          state?: Database["public"]["Enums"]["budget_state"]
          type: Database["public"]["Enums"]["budget_type"]
          updated_at?: string
        }
        Update: {
          achieved_amount?: number
          achievement_percentage?: number
          analytical_account_id?: string
          budgeted_amount?: number
          created_at?: string
          end_date?: string
          id?: string
          is_archived?: boolean
          name?: string
          parent_budget_id?: string | null
          remaining_balance?: number
          start_date?: string
          state?: Database["public"]["Enums"]["budget_state"]
          type?: Database["public"]["Enums"]["budget_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_parent_budget_id_fkey"
            columns: ["parent_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          image_url: string | null
          is_archived: boolean
          name: string
          phone: string | null
          pincode: string | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          is_archived?: boolean
          name: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          is_archived?: boolean
          name?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_invoice_lines: {
        Row: {
          analytical_account_id: string | null
          budget_id: string | null
          customer_invoice_id: string
          id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          analytical_account_id?: string | null
          budget_id?: string | null
          customer_invoice_id: string
          id?: string
          product_id: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          analytical_account_id?: string | null
          budget_id?: string | null
          customer_invoice_id?: string
          id?: string
          product_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoice_lines_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_invoices: {
        Row: {
          analytical_account_id: string | null
          created_at: string
          customer_id: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          is_archived: boolean
          notes: string | null
          paid_amount: number
          sales_order_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analytical_account_id?: string | null
          created_at?: string
          customer_id: string
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number: string
          is_archived?: boolean
          notes?: string | null
          paid_amount?: number
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analytical_account_id?: string | null
          created_at?: string
          customer_id?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_archived?: boolean
          notes?: string | null
          paid_amount?: number
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_invoices_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          customer_invoice_id: string
          id: string
          mode: Database["public"]["Enums"]["payment_mode"]
          notes: string | null
          payment_date: string
          payment_number: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_invoice_id: string
          id?: string
          mode: Database["public"]["Enums"]["payment_mode"]
          notes?: string | null
          payment_date?: string
          payment_number: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_invoice_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          notes?: string | null
          payment_date?: string
          payment_number?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_customer_invoice_id_fkey"
            columns: ["customer_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_archived: boolean
          linked_analytic_account_id: string | null
          name: string
          purchase_price: number
          sales_price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean
          linked_analytic_account_id?: string | null
          name: string
          purchase_price?: number
          sales_price?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean
          linked_analytic_account_id?: string | null
          name?: string
          purchase_price?: number
          sales_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_linked_analytic_account_id_fkey"
            columns: ["linked_analytic_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          portal_contact_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          portal_contact_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          portal_contact_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_portal_contact"
            columns: ["portal_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          analytical_account_id: string | null
          budget_id: string | null
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          analytical_account_id?: string | null
          budget_id?: string | null
          id?: string
          product_id: string
          purchase_order_id: string
          quantity?: number
          subtotal: number
          unit_price: number
        }
        Update: {
          analytical_account_id?: string | null
          budget_id?: string | null
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          analytical_account_id: string | null
          created_at: string
          expected_delivery_date: string | null
          id: string
          is_archived: boolean
          notes: string | null
          order_date: string
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          analytical_account_id?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          is_archived?: boolean
          notes?: string | null
          order_date?: string
          order_number: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          analytical_account_id?: string | null
          created_at?: string
          expected_delivery_date?: string | null
          id?: string
          is_archived?: boolean
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_lines: {
        Row: {
          analytical_account_id: string | null
          budget_id: string | null
          id: string
          product_id: string
          quantity: number
          sales_order_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          analytical_account_id?: string | null
          budget_id?: string | null
          id?: string
          product_id: string
          quantity?: number
          sales_order_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          analytical_account_id?: string | null
          budget_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          sales_order_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_lines_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          analytical_account_id: string | null
          created_at: string
          customer_id: string
          expected_delivery_date: string | null
          id: string
          is_archived: boolean
          notes: string | null
          order_date: string
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analytical_account_id?: string | null
          created_at?: string
          customer_id: string
          expected_delivery_date?: string | null
          id?: string
          is_archived?: boolean
          notes?: string | null
          order_date?: string
          order_number: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analytical_account_id?: string | null
          created_at?: string
          customer_id?: string
          expected_delivery_date?: string | null
          id?: string
          is_archived?: boolean
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_bill_lines: {
        Row: {
          analytical_account_id: string | null
          budget_id: string | null
          id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
          vendor_bill_id: string
        }
        Insert: {
          analytical_account_id?: string | null
          budget_id?: string | null
          id?: string
          product_id: string
          quantity?: number
          subtotal: number
          unit_price: number
          vendor_bill_id: string
        }
        Update: {
          analytical_account_id?: string | null
          budget_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          vendor_bill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bill_lines_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bill_lines_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bills: {
        Row: {
          analytical_account_id: string | null
          bill_date: string
          bill_number: string
          created_at: string
          due_date: string
          id: string
          is_archived: boolean
          notes: string | null
          paid_amount: number
          purchase_order_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          updated_at: string
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          analytical_account_id?: string | null
          bill_date?: string
          bill_number: string
          created_at?: string
          due_date: string
          id?: string
          is_archived?: boolean
          notes?: string | null
          paid_amount?: number
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          analytical_account_id?: string | null
          bill_date?: string
          bill_number?: string
          created_at?: string
          due_date?: string
          id?: string
          is_archived?: boolean
          notes?: string | null
          paid_amount?: number
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_analytical_account_id_fkey"
            columns: ["analytical_account_id"]
            isOneToOne: false
            referencedRelation: "analytical_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_matching_analytical_account: {
        Args: { p_partner_id: string; p_product_id: string }
        Returns: string
      }
      get_contact_tag_ids: { Args: { contact_id: string }; Returns: string[] }
      get_portal_contact_id: { Args: { _user_id: string }; Returns: string }
      get_product_category_id: { Args: { product_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "portal"
      budget_state: "draft" | "confirmed" | "revised" | "archived"
      budget_type: "income" | "expense"
      invoice_status:
        | "draft"
        | "posted"
        | "paid"
        | "partially_paid"
        | "cancelled"
      order_status: "draft" | "confirmed" | "cancelled"
      payment_mode: "cash" | "bank_transfer" | "cheque" | "online"
      payment_status: "pending" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "portal"],
      budget_state: ["draft", "confirmed", "revised", "archived"],
      budget_type: ["income", "expense"],
      invoice_status: [
        "draft",
        "posted",
        "paid",
        "partially_paid",
        "cancelled",
      ],
      order_status: ["draft", "confirmed", "cancelled"],
      payment_mode: ["cash", "bank_transfer", "cheque", "online"],
      payment_status: ["pending", "completed", "failed"],
    },
  },
} as const
