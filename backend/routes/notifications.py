from datetime import datetime
from flask import request, jsonify
from extensions import db
from models.notification import Notification
from flask_jwt_extended import jwt_required
from utils import role_required
from routes import notifications_bp


@notifications_bp.route('', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def get_notifications():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Notification.query.order_by(Notification.is_read.asc(), Notification.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': {
                'notifications': [notification.to_dict() for notification in pagination.items],
                'total_pages': pagination.pages,
                'total_items': pagination.total,
                'current_page': page,
                'per_page': per_page
            },
            'message': 'Notifications retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def unread_count():
    try:
        count = Notification.query.filter_by(is_read=False).count()
        return jsonify({'success': True, 'data': {'count': count}, 'message': 'Unread count retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@notifications_bp.route('/<int:id>/read', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def mark_read(id):
    try:
        notification = Notification.query.get(id)
        if not notification:
            return jsonify({'success': False, 'data': None, 'message': 'Notification not found'}), 404

        notification.is_read = True
        db.session.commit()

        return jsonify({'success': True, 'data': notification.to_dict(), 'message': 'Notification marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@notifications_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
@role_required('admin', 'manager', 'staff')
def mark_all_read():
    try:
        Notification.query.filter_by(is_read=False).update({'is_read': True})
        db.session.commit()

        return jsonify({'success': True, 'data': None, 'message': 'All notifications marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@notifications_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_notification(id):
    try:
        notification = Notification.query.get(id)
        if not notification:
            return jsonify({'success': False, 'data': None, 'message': 'Notification not found'}), 404

        db.session.delete(notification)
        db.session.commit()

        return jsonify({'success': True, 'data': None, 'message': 'Notification deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
